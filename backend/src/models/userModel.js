const pool = require('../config/database');

const userModel = {
  // Tìm user theo email (bao gồm password_hash để login)
  findByEmail: async (email) => {
    const result = await pool.query(
      `SELECT user_id, name, email, password_hash, role_id, department_id, is_active 
       FROM users WHERE email = $1 AND is_active = true`,
      [email]
    );
    return result.rows[0];
  },

  // Tìm user theo ID (không lấy password_hash)
  findById: async (userId) => {
    const result = await pool.query(
      `SELECT user_id, name, email, role_id, department_id, created_at 
       FROM users WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }
};

module.exports = userModel;