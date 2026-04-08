const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const pool = require('../config/db');

router.get('/audit-logs', auth, role('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT al.id, al.action, al.details, al.created_at, u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 200
    `);
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
