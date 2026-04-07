const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const signToken = (user) => jwt.sign(
  { id: user.id, email: user.email, role: user.role, name: user.name, department: user.department, department_id: user.department_id },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.password, u.is_active, u.department_id,
        d.name as department
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.email = $1
    `, [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)', [user.id, 'USER_LOGIN', `${user.name} logged in`]);
    const token = signToken(user);
    const { password: _, ...safeUser } = user;
    res.json({ data: { token, user: safeUser } });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.me = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.is_active, u.department_id, d.name as department
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = $1
    `, [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
};