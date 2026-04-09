const pool = require('../config/db');

exports.list = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.id, c.name,
        EXISTS(SELECT 1 FROM idea_categories ic WHERE ic.category_id = c.id) as used,
        COUNT(DISTINCT ic.idea_id) as idea_count
      FROM categories c
      LEFT JOIN idea_categories ic ON ic.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name
    `);
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  try {
    const { rows } = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING id, name', [name.trim()]);
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [req.user.id, 'CATEGORY_CREATE', `Created category: ${name.trim()}`]);
    res.json({ data: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Category already exists' });
    res.status(500).json({ error: e.message });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  const force = req.query.force === 'true';
  try {
    const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM idea_categories WHERE category_id = $1', [id]);
    const count = parseInt(countRows[0].count);
    if (count > 0 && !force) {
      return res.status(409).json({ error: `Cannot delete: this category is used by ${count} idea(s)`, inUse: true, count });
    }
    const { rows: catRows } = await pool.query('SELECT name FROM categories WHERE id = $1', [id]);
    if (count > 0) {
      await pool.query('DELETE FROM idea_categories WHERE category_id = $1', [id]);
    }
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [req.user.id, 'CATEGORY_DELETE', `Deleted category: ${catRows[0]?.name}${count > 0 ? ` (force, removed from ${count} ideas)` : ''}`]);
    res.json({ data: { message: 'Deleted' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
