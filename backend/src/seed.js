const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function dropTables(client) {
  // Drop in reverse dependency order
  await client.query('DROP TABLE IF EXISTS audit_logs CASCADE');
  await client.query('DROP TABLE IF EXISTS notifications CASCADE');
  await client.query('DROP TABLE IF EXISTS attachments CASCADE');
  await client.query('DROP TABLE IF EXISTS votes CASCADE');
  await client.query('DROP TABLE IF EXISTS comments CASCADE');
  await client.query('DROP TABLE IF EXISTS idea_categories CASCADE');
  await client.query('DROP TABLE IF EXISTS ideas CASCADE');
  await client.query('DROP TABLE IF EXISTS closure_dates CASCADE');
  await client.query('DROP TABLE IF EXISTS academic_years CASCADE');
  await client.query('DROP TABLE IF EXISTS categories CASCADE');
  await client.query('DROP TABLE IF EXISTS users CASCADE');
  await client.query('DROP TABLE IF EXISTS departments CASCADE');
  console.log('Dropped all existing tables.');
}

async function createTables(client) {
  // 1. departments (without qa_coordinator_id — added after users)
  await client.query(`
    CREATE TABLE departments (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 2. users (with department_id FK → departments)
  await client.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      role VARCHAR(50) NOT NULL CHECK(role IN ('staff','qa_coordinator','qa_manager','admin')),
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      password TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 3. Add qa_coordinator_id to departments (circular FK, added after users exists)
  await client.query(`
    ALTER TABLE departments ADD COLUMN qa_coordinator_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  `);

  // 4. categories
  await client.query(`
    CREATE TABLE categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 5. academic_years
  await client.query(`
    CREATE TABLE academic_years (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 6. closure_dates
  await client.query(`
    CREATE TABLE closure_dates (
      id SERIAL PRIMARY KEY,
      label VARCHAR(255) NOT NULL,
      date DATE NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'open',
      academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE CASCADE
    );
  `);

  // 7. ideas (author_id nullable for ON DELETE SET NULL, has department_id)
  await client.query(`
    CREATE TABLE ideas (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      anonymous BOOLEAN NOT NULL DEFAULT false,
      status VARCHAR(50) NOT NULL DEFAULT 'open',
      views INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 8. idea_categories
  await client.query(`
    CREATE TABLE idea_categories (
      idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      PRIMARY KEY(idea_id, category_id)
    );
  `);

  // 9. comments (author_id nullable for ON DELETE SET NULL)
  await client.query(`
    CREATE TABLE comments (
      id SERIAL PRIMARY KEY,
      idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
      author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      body TEXT NOT NULL,
      anonymous BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 10. votes (ON DELETE CASCADE for both)
  await client.query(`
    CREATE TABLE votes (
      id SERIAL PRIMARY KEY,
      idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      value INTEGER NOT NULL CHECK(value IN (1,-1)),
      UNIQUE(idea_id, user_id)
    );
  `);

  // 11. attachments
  await client.query(`
    CREATE TABLE attachments (
      id SERIAL PRIMARY KEY,
      idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
      filename VARCHAR(255) NOT NULL,
      filepath VARCHAR(500) NOT NULL,
      uploaded_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 12. notifications (ON DELETE CASCADE for user)
  await client.query(`
    CREATE TABLE notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      type VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      idea_id INTEGER REFERENCES ideas(id) ON DELETE CASCADE,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 13. audit_logs (ON DELETE SET NULL so logs survive user deletion)
  await client.query(`
    CREATE TABLE audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      details TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('All tables created.');
}

async function seed() {
  const client = await pool.connect();
  try {
    await dropTables(client);
    await createTables(client);

    // ── 1. Seed departments (no coordinator yet) ─────────────────────────────
    const deptNames = ['Computer Science', 'Human Resources', 'Quality Assurance', 'IT Services', 'Business School', 'Engineering'];
    const insertedDepts = {};
    for (const name of deptNames) {
      const { rows } = await client.query(
        'INSERT INTO departments (name) VALUES ($1) RETURNING id, name',
        [name]
      );
      insertedDepts[name] = rows[0].id;
    }
    console.log('Departments seeded.');

    // ── 2. Seed users (with department_id) ───────────────────────────────────
    const usersData = [
      { name: 'Dr. Sarah Mitchell',  email: 's.mitchell@gmail.com', role: 'staff',          dept: 'Computer Science',  password: 'sarah123'  },
      { name: 'Ms. Claire Thompson', email: 'c.thompson@gmail.com', role: 'qa_coordinator', dept: 'Human Resources',   password: 'claire123' },
      { name: 'Prof. David Harrison',email: 'd.harrison@gmail.com', role: 'qa_manager',     dept: 'Quality Assurance', password: 'david123'  },
      { name: 'Mr. Tom Brady',       email: 't.brady@gmail.com',    role: 'admin',           dept: 'IT Services',       password: 'tom123'    },
      { name: 'Dr. Alice Wong',      email: 'a.wong@gmail.com',     role: 'staff',          dept: 'Human Resources',   password: 'alice123'  },
      { name: 'Mr. James Ford',      email: 'j.ford@gmail.com',     role: 'staff',          dept: 'Computer Science',  password: 'james123'  },
    ];

    const insertedUsers = {};
    for (const u of usersData) {
      const hash = await bcrypt.hash(u.password, 10);
      const deptId = insertedDepts[u.dept];
      const { rows } = await client.query(
        'INSERT INTO users (name, email, role, department_id, password) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role, department_id',
        [u.name, u.email, u.role, deptId, hash]
      );
      insertedUsers[u.email] = rows[0];
      console.log(`  Created user: ${u.name} (${u.role})`);
    }

    // ── 3. Set qa_coordinator_id on departments ───────────────────────────────
    const claire = insertedUsers['c.thompson@gmail.com'];
    await client.query(
      'UPDATE departments SET qa_coordinator_id = $1 WHERE id = $2',
      [claire.id, insertedDepts['Human Resources']]
    );
    console.log('QA Coordinator assigned to Human Resources.');

    // ── 4. Seed categories ────────────────────────────────────────────────────
    const categoryNames = ['Technology', 'Environment', 'Wellbeing', 'Facilities', 'Teaching & Learning', 'Administration'];
    const insertedCats = {};
    for (const name of categoryNames) {
      const { rows } = await client.query('INSERT INTO categories (name) VALUES ($1) RETURNING id, name', [name]);
      insertedCats[name] = rows[0].id;
    }
    console.log('Categories seeded.');

    // ── 5. Seed academic year + closure dates ─────────────────────────────────
    const { rows: yearRows } = await client.query(
      "INSERT INTO academic_years (name) VALUES ('Academic Year 2025/26') RETURNING id"
    );
    const yearId = yearRows[0].id;
    await client.query(`
      INSERT INTO closure_dates (label, date, status, academic_year_id) VALUES
      ('Ideas Closure Date', '2026-06-15', 'open', $1),
      ('Final Closure Date', '2026-07-15', 'open', $1)
    `, [yearId]);
    console.log('Academic year and closure dates seeded.');

    // ── 6. Seed ideas (with department_id) ───────────────────────────────────
    const sarah  = insertedUsers['s.mitchell@gmail.com'];
    const alice  = insertedUsers['a.wong@gmail.com'];
    const james  = insertedUsers['j.ford@gmail.com'];

    const ideasData = [
      {
        title: 'Implement a Peer Mentoring Programme',
        body: 'I propose we introduce a structured peer mentoring programme where experienced staff support newer colleagues. This would reduce onboarding time, improve knowledge transfer, and increase overall staff satisfaction. Initial pilot could run across two departments with quarterly reviews.',
        author_id: sarah.id, dept_id: insertedDepts['Computer Science'],
        anonymous: false, status: 'open', views: 142,
        cats: ['Teaching & Learning', 'Wellbeing'],
      },
      {
        title: 'Green Campus Initiative — Solar Panel Installation',
        body: "Installing solar panels on the roof of the main academic building would reduce our carbon footprint significantly. Based on estimates, we could offset 30% of our annual electricity usage. This aligns with the university's 2030 sustainability targets.",
        author_id: alice.id, dept_id: insertedDepts['Human Resources'],
        anonymous: false, status: 'open', views: 98,
        cats: ['Environment', 'Facilities'],
      },
      {
        title: 'Online Resource Hub for Postgraduate Students',
        body: 'A centralised online portal where postgraduate students can find resources, guidelines, thesis templates, and supervisor contact information. Currently this information is scattered across multiple systems and websites, causing confusion and delays.',
        author_id: james.id, dept_id: insertedDepts['Computer Science'],
        anonymous: true, status: 'open', views: 211,
        cats: ['Technology', 'Teaching & Learning'],
      },
      {
        title: 'Flexible Working Hours Policy Update',
        body: 'Updating the flexible working policy to allow staff to start between 7am and 10am would improve work-life balance and reduce peak commuting pressure on parking. A 6-month trial with department head approval would provide valuable data.',
        author_id: claire.id, dept_id: insertedDepts['Human Resources'],
        anonymous: false, status: 'open', views: 76,
        cats: ['Wellbeing', 'Administration'],
      },
      {
        title: 'Upgrade Library Digital Resources Subscription',
        body: 'The current journal subscription package lacks access to several key publications in engineering and computer science. Upgrading the JSTOR and IEEE Xplore subscriptions would directly benefit research output and student dissertation quality.',
        author_id: sarah.id, dept_id: insertedDepts['Computer Science'],
        anonymous: false, status: 'open', views: 54,
        cats: ['Technology', 'Facilities'],
      },
      {
        title: 'Staff Wellbeing Room Renovation',
        body: 'The current staff rest room in Building C needs renovation. Adding comfortable seating, better lighting, and a small kitchenette would give staff a genuine place to decompress between classes. A welfare survey showed 78% of staff rarely use the current facility.',
        author_id: alice.id, dept_id: insertedDepts['Human Resources'],
        anonymous: true, status: 'open', views: 33,
        cats: ['Wellbeing', 'Facilities'],
      },
    ];

    const insertedIdeas = [];
    for (const idea of ideasData) {
      const daysAgo = Math.floor(Math.random() * 30);
      const { rows } = await client.query(
        `INSERT INTO ideas (title, body, author_id, department_id, anonymous, status, views, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7, NOW() - INTERVAL '1 day' * $8) RETURNING id`,
        [idea.title, idea.body, idea.author_id, idea.dept_id, idea.anonymous, idea.status, idea.views, daysAgo]
      );
      const ideaId = rows[0].id;
      insertedIdeas.push(ideaId);
      for (const catName of idea.cats) {
        await client.query('INSERT INTO idea_categories (idea_id, category_id) VALUES ($1,$2)', [ideaId, insertedCats[catName]]);
      }
    }
    console.log('Ideas seeded.');

    // ── 7. Seed votes ─────────────────────────────────────────────────────────
    const voteData = [
      { idea_id: insertedIdeas[0], user_id: alice.id,  value:  1 },
      { idea_id: insertedIdeas[0], user_id: james.id,  value:  1 },
      { idea_id: insertedIdeas[0], user_id: claire.id, value:  1 },
      { idea_id: insertedIdeas[1], user_id: sarah.id,  value:  1 },
      { idea_id: insertedIdeas[1], user_id: james.id,  value: -1 },
      { idea_id: insertedIdeas[2], user_id: sarah.id,  value:  1 },
      { idea_id: insertedIdeas[2], user_id: alice.id,  value:  1 },
      { idea_id: insertedIdeas[3], user_id: james.id,  value: -1 },
      { idea_id: insertedIdeas[4], user_id: alice.id,  value:  1 },
    ];
    for (const v of voteData) {
      await client.query('INSERT INTO votes (idea_id, user_id, value) VALUES ($1,$2,$3)', [v.idea_id, v.user_id, v.value]);
    }
    console.log('Votes seeded.');

    // ── 8. Seed comments ──────────────────────────────────────────────────────
    const commentData = [
      { idea_id: insertedIdeas[0], author_id: alice.id,  body: 'Great idea! I would really benefit from this as a newer member of staff.', anonymous: false },
      { idea_id: insertedIdeas[0], author_id: james.id,  body: 'We tried something similar at my previous institution and it worked very well.', anonymous: false },
      { idea_id: insertedIdeas[1], author_id: sarah.id,  body: 'The ROI on solar panels is typically 7-10 years. Worth the investment for the long term.', anonymous: false },
      { idea_id: insertedIdeas[2], author_id: claire.id, body: 'This is definitely needed. I spent 2 hours trying to find the ethics form last week.', anonymous: true },
      { idea_id: insertedIdeas[3], author_id: james.id,  body: 'I think this needs more thought around core hours coverage.', anonymous: false },
    ];
    for (const c of commentData) {
      await client.query(
        'INSERT INTO comments (idea_id, author_id, body, anonymous) VALUES ($1,$2,$3,$4)',
        [c.idea_id, c.author_id, c.body, c.anonymous]
      );
    }
    console.log('Comments seeded.');

    console.log('\n✅ Seed complete!');
    console.log('Login credentials:');
    console.log('  s.mitchell@gmail.com / sarah123  (staff, Computer Science)');
    console.log('  c.thompson@gmail.com / claire123 (qa_coordinator, Human Resources)');
    console.log('  d.harrison@gmail.com / david123  (qa_manager, Quality Assurance)');
    console.log('  t.brady@gmail.com    / tom123    (admin, IT Services)');
    console.log('  a.wong@gmail.com     / alice123  (staff, Human Resources)');
    console.log('  j.ford@gmail.com     / james123  (staff, Computer Science)');
  } catch (err) {
    console.error('Seed error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
