const pool = require('../config/db');

exports.list = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT d.id, d.name, d.qa_coordinator_id,
        u.name as coordinator_name,
        COUNT(DISTINCT i.id) as ideas
      FROM departments d
      LEFT JOIN users u ON d.qa_coordinator_id = u.id
      LEFT JOIN ideas i ON i.department_id = d.id
      GROUP BY d.id, d.name, d.qa_coordinator_id, u.name
      ORDER BY d.name
    `);
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Department name required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO departments (name) VALUES ($1) RETURNING id, name',
      [name]
    );
    res.json({ data: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Department already exists' });
    res.status(500).json({ error: e.message });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT name FROM departments WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Department not found' });
    await pool.query('DELETE FROM departments WHERE id = $1', [id]);
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [req.user.id, 'DEPT_DELETE', `Deleted department: ${rows[0].name}`]);
    res.json({ data: { message: 'Deleted' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
