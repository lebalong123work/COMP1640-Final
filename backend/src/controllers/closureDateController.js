const pool = require('../config/db');

exports.list = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM closure_dates ORDER BY date ASC');
    const now = new Date();
    const formatted = rows.map(r => {
      const dateStr = r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date;
      const dateVal = new Date(dateStr + 'T23:59:59+07:00');
      return {
        ...r,
        date: dateStr,
        status: dateVal < now ? 'closed' : 'open',
      };
    });
    res.json({ data: formatted });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM closure_dates WHERE id = $1', [id]);
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [req.user.id, 'CLOSURE_DATE_DELETE', `Deleted closure date ${id}`]);
    res.json({ data: { message: 'Deleted' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { label, date, status } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE closure_dates SET label = COALESCE($1, label), date = COALESCE($2, date), status = COALESCE($3, status) WHERE id = $4 RETURNING *',
      [label, date, status, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [req.user.id, 'CLOSURE_DATE_UPDATE', `Updated closure date ${id}`]);
    const r = rows[0];
    res.json({ data: { ...r, date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date } });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
