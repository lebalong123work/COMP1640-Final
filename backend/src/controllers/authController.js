const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
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

// BE-11: Implement forgot password functionality
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const { rows } = await pool.query('SELECT id, name FROM users WHERE email = $1', [email]);
    if (!rows[0]) return res.status(404).json({ error: 'Email not found' });

    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let newPassword = '';
    for (let i = 0; i < 8; i++) newPassword += chars[Math.floor(Math.random() * chars.length)];

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, rows[0].id]);

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your New Password — University Ideas Portal',
        text: `Hello ${rows[0].name},\n\nYour password has been reset. This is your new password: ${newPassword}\n\nPlease log in and change your password as soon as possible.\n\nUniversity Ideas Portal`,
        html: `<p>Hello <strong>${rows[0].name}</strong>,</p><p>Your password has been reset. This is your new password: <strong>${newPassword}</strong></p><p>Please log in and change your password as soon as possible.</p><p>University Ideas Portal</p>`
      });
    } catch (emailErr) {
      console.warn('Email send failed:', emailErr.message);
    }

    res.json({ data: { message: 'A new password has been sent to your email.' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
// BE-11: Implement forgot password functionality

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
