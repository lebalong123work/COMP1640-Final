const pool = require('../config/db');

exports.list = async (req, res) => {
  try {
    const { rows: years } = await pool.query('SELECT * FROM academic_years ORDER BY created_at DESC');
    const result = await Promise.all(years.map(async (y) => {
      const { rows: dates } = await pool.query(
        'SELECT * FROM closure_dates WHERE academic_year_id = $1 ORDER BY date ASC',
        [y.id]
      );
      const now = new Date();
      return {
        ...y,
        closureDates: dates.map(d => {
          const dateStr = d.date instanceof Date ? d.date.toISOString().split('T')[0] : d.date;
          const dateVal = new Date(dateStr + 'T23:59:59+07:00');
          return { ...d, date: dateStr, status: dateVal < now ? 'closed' : 'open' };
        }),
      };
    }));
    res.json({ data: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Academic year name required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO academic_years (name) VALUES ($1) RETURNING *',
      [name]
    );
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [req.user.id, 'ACADEMIC_YEAR_CREATE', `Created academic year: ${name}`]);
    res.json({ data: { ...rows[0], closureDates: [] } });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Academic year already exists' });
    res.status(500).json({ error: e.message });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE academic_years SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [req.user.id, 'ACADEMIC_YEAR_UPDATE', `Updated academic year ${id}`]);
    res.json({ data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM closure_dates WHERE academic_year_id = $1', [id]);
    await pool.query('DELETE FROM academic_years WHERE id = $1', [id]);
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [req.user.id, 'ACADEMIC_YEAR_DELETE', `Deleted academic year ${id}`]);
    res.json({ data: { message: 'Deleted' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.addClosureDate = async (req, res) => {
  const { yearId } = req.params;
  const { label, date, status } = req.body;
  if (!label || !date) return res.status(400).json({ error: 'Label and date required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO closure_dates (label, date, status, academic_year_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [label, date, status || 'open', parseInt(yearId)]
    );
    const r = rows[0];
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [req.user.id, 'CLOSURE_DATE_CREATE', `Added closure date: ${label} for year ${yearId}`]);
    const dateStr = r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date;
    const dateVal = new Date(dateStr + 'T23:59:59+07:00');
    res.json({ data: { ...r, date: dateStr, status: dateVal < new Date() ? 'closed' : 'open' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
