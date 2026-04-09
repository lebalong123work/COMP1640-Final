const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const generatePassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
};

const sendWelcomeEmail = async (email, name, password) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    const loginUrl = 'http://localhost:5173';
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Ideas for Improvement Account Has Been Created',
      text: `Hello ${name},\n\nYour account for the Ideas for Improvement portal has been created.\n\nHere are your login details:\n- Email: ${email}\n- Password: ${password}\n- Login page: ${loginUrl}\n\nPlease change your password after your first login.\n\nRegards,\nUniversity QA Portal Admin`,
      html: `<p>Hello <strong>${name}</strong>,</p><p>Your account for the Ideas for Improvement portal has been created.</p><p><strong>Here are your login details:</strong></p><ul><li>Email: ${email}</li><li>Password: <strong>${password}</strong></li><li>Login page: <a href="${loginUrl}">${loginUrl}</a></li></ul><p>Please change your password after your first login.</p><p>Regards,<br>University QA Portal Admin</p>`
    });
  } catch (emailErr) {
    console.warn('Welcome email send failed:', emailErr.message);
  }
};

exports.list = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.is_active, u.department_id, d.name as department
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.name
    `);
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
  const { name, email, role, department } = req.body;
  // Admin accounts do not belong to any department
  const requiresDept = role !== 'admin';
  if (!name || !email || !role || (requiresDept && !department)) return res.status(400).json({ error: 'All fields required' });
  try {
    // Enforce: only one Admin account allowed
    if (role === 'admin') {
      const { rows: existing } = await pool.query('SELECT id FROM users WHERE role = $1', ['admin']);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'An Admin account already exists. Only one Admin account is allowed.' });
      }
    }

    // Enforce: only one QA Manager account allowed
    if (role === 'qa_manager') {
      const { rows: existing } = await pool.query('SELECT id FROM users WHERE role = $1', ['qa_manager']);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'A QA Manager account already exists. Delete the existing QA Manager account before creating a new one.' });
      }
    }

    let departmentId = null;
    if (requiresDept) {
      // Resolve department name → id
      const deptResult = await pool.query('SELECT id FROM departments WHERE name = $1', [department]);
      if (!deptResult.rows[0]) return res.status(400).json({ error: 'Department not found' });
      departmentId = deptResult.rows[0].id;

      // Enforce: only one QA Coordinator per department
      if (role === 'qa_coordinator') {
        const { rows: existing } = await pool.query(
          'SELECT id FROM users WHERE role = $1 AND department_id = $2',
          ['qa_coordinator', departmentId]
        );
        if (existing.length > 0) {
          return res.status(409).json({ error: 'This department already has a QA Coordinator account. You cannot grant this permission to this person.' });
        }
      }
    }

    // Auto-generate password
    const plainPassword = generatePassword();
    const hash = await bcrypt.hash(plainPassword, 10);

    const { rows } = await pool.query(
      'INSERT INTO users (name, email, role, department_id, password) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role, department_id',
      [name, email, role, departmentId, hash]
    );
    const newUser = rows[0];

    // Update departments.qa_coordinator_id if new user is a qa_coordinator
    if (role === 'qa_coordinator' && departmentId) {
      await pool.query(
        'UPDATE departments SET qa_coordinator_id = $1 WHERE id = $2',
        [newUser.id, departmentId]
      );
    }

    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [req.user.id, 'USER_CREATE', `Created user: ${name}`]);

    // Send welcome email with credentials to the employee's Gmail
    await sendWelcomeEmail(email, name, plainPassword);

    res.json({ data: { ...newUser, department: department || null } });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: e.message });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  try {
    const { rows } = await pool.query('SELECT id, name, role, department_id FROM users WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];
    if (user.role === 'qa_coordinator' && user.department_id) {
      await pool.query(
        'UPDATE departments SET qa_coordinator_id = NULL WHERE id = $1 AND qa_coordinator_id = $2',
        [user.department_id, user.id]
      );
    }
    // Retain ideas and comments — set author_id to NULL so they persist as "Deleted User"
    await pool.query('UPDATE ideas SET author_id = NULL WHERE author_id = $1', [id]);
    await pool.query('UPDATE comments SET author_id = NULL WHERE author_id = $1', [id]);
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [req.user.id, 'USER_DELETE', `Deleted user id: ${id}`]);
    res.json({ data: { message: 'Deleted' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.changePassword = async (req, res) => {
  const { role, id: userId } = req.user;
  if (role !== 'staff') return res.status(403).json({ error: 'Only staff can change their password' });
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
  try {
    const { rows } = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, userId]);
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [userId, 'PASSWORD_CHANGE', 'User changed their password']);
    res.json({ data: { message: 'Password changed successfully' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
