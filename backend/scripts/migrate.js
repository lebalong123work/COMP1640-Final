/**
 * Migration script — adds academic_years table and academic_year_id column to closure_dates.
 * Safe to run multiple times (uses IF NOT EXISTS / DO NOTHING).
 */
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    // 1. Create academic_years table
    await client.query(`
      CREATE TABLE IF NOT EXISTS academic_years (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('academic_years table: OK');

    // 2. Add academic_year_id column to closure_dates (safe if already exists)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='closure_dates' AND column_name='academic_year_id'
        ) THEN
          ALTER TABLE closure_dates ADD COLUMN academic_year_id INTEGER REFERENCES academic_years(id);
        END IF;
      END$$;
    `);
    console.log('closure_dates.academic_year_id column: OK');

    // 3. If there are existing closure_dates with no academic_year_id, create a default year
    const { rows: orphaned } = await client.query(
      'SELECT COUNT(*) FROM closure_dates WHERE academic_year_id IS NULL'
    );
    if (parseInt(orphaned[0].count) > 0) {
      // Insert default academic year if not exists
      await client.query(`
        INSERT INTO academic_years (name) VALUES ('Academic Year 2025/26')
        ON CONFLICT (name) DO NOTHING
      `);
      const { rows: yearRows } = await client.query(
        "SELECT id FROM academic_years WHERE name = 'Academic Year 2025/26'"
      );
      if (yearRows[0]) {
        await client.query(
          'UPDATE closure_dates SET academic_year_id = $1 WHERE academic_year_id IS NULL',
          [yearRows[0].id]
        );
        console.log(`Assigned ${orphaned[0].count} orphaned closure dates to default academic year.`);
      }
    }

    console.log('\nMigration complete!');
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
