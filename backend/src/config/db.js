const { Pool, types } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

// Return PostgreSQL DATE columns as plain strings (YYYY-MM-DD) instead of
// converting to JS Date objects — prevents off-by-one day shifts for UTC+7 users.
types.setTypeParser(1082, val => val);

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
module.exports = pool;
