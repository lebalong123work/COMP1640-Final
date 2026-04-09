const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const checkFinalClosure = async () => {
  const result = await pool.query("SELECT date FROM closure_dates WHERE label = 'Final Closure Date' ORDER BY date DESC LIMIT 1");
  if (result.rows[0] && new Date() <= new Date(result.rows[0].date)) {
    return result.rows[0].date;
  }
  return null;
};

const esc = (v) => `"${String(v || '').replace(/"/g, '""')}"`;

exports.exportCsv = async (req, res) => {
  try {
    const notYetClosed = await checkFinalClosure();
    if (notYetClosed) {
      return res.status(403).json({ error: `Exports are only available after the Final Closure Date (${notYetClosed}).` });
    }

    const { rows: ideas } = await pool.query(`
      SELECT i.id, i.title, i.anonymous, i.status, i.views, i.created_at,
        CASE WHEN i.anonymous THEN 'Anonymous' ELSE COALESCE(u.name, 'Deleted User') END as author,
        d.name as department,
        (SELECT COUNT(*) FROM votes WHERE idea_id = i.id AND value = 1) as thumbs_up,
        (SELECT COUNT(*) FROM votes WHERE idea_id = i.id AND value = -1) as thumbs_down,
        (SELECT STRING_AGG(cat.name, '; ') FROM idea_categories ic JOIN categories cat ON cat.id = ic.category_id WHERE ic.idea_id = i.id) as categories
      FROM ideas i
      LEFT JOIN users u ON i.author_id = u.id
      LEFT JOIN departments d ON i.department_id = d.id
      ORDER BY i.created_at DESC
    `);

    const ideaHeaders = ['ideaId', 'title', 'Author', 'Department', 'Class', 'Thump up', 'Thump down', 'View', 'Date', 'status'];
    const ideaRows = ideas.map(r => [
      r.id,
      esc(r.title),
      esc(r.author),
      esc(r.department),
      esc(r.categories),
      r.thumbs_up,
      r.thumbs_down,
      r.views,
      new Date(r.created_at).toISOString().split('T')[0],
      r.status,
    ].join(','));

    const { rows: comments } = await pool.query(`
      SELECT c.id, c.idea_id, c.body, c.created_at
      FROM comments c
      ORDER BY c.created_at DESC
    `);

    const commentHeaders = ['commentId', 'ideaId', 'content', 'language', 'createdwith'];
    const commentRows = comments.map(r => [
      r.id,
      r.idea_id,
      esc(r.body),
      'en',
      new Date(r.created_at).toISOString().split('T')[0],
    ].join(','));

    const csv = [
      '--- idea_export ---',
      ideaHeaders.join(','),
      ...ideaRows,
      '',
      '--- comment_export ---',
      commentHeaders.join(','),
      ...commentRows,
    ].join('\n');

    const closureDateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="closure_date_export_${closureDateStr}.csv"`);
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.exportIdeaCsv = async (req, res) => {
  try {
    const notYetClosed = await checkFinalClosure();
    if (notYetClosed) return res.status(403).json({ error: `Exports are only available after the Final Closure Date (${notYetClosed}).` });

    const { rows } = await pool.query(`
      SELECT i.id, i.title, i.anonymous, i.status, i.views, i.created_at,
        CASE WHEN i.anonymous THEN 'Anonymous' ELSE COALESCE(u.name, 'Deleted User') END as author,
        d.name as department,
        (SELECT COUNT(*) FROM votes WHERE idea_id = i.id AND value = 1) as thumbs_up,
        (SELECT COUNT(*) FROM votes WHERE idea_id = i.id AND value = -1) as thumbs_down,
        (SELECT STRING_AGG(cat.name, '; ') FROM idea_categories ic JOIN categories cat ON cat.id = ic.category_id WHERE ic.idea_id = i.id) as categories
      FROM ideas i
      LEFT JOIN users u ON i.author_id = u.id
      LEFT JOIN departments d ON i.department_id = d.id
      ORDER BY i.created_at DESC
    `);

    const headers = ['ideaId', 'title', 'Author', 'Department', 'Class', 'Thump up', 'Thump down', 'View', 'Date', 'status'];
    const csvRows = rows.map(r => [r.id, esc(r.title), esc(r.author), esc(r.department), esc(r.categories), r.thumbs_up, r.thumbs_down, r.views, new Date(r.created_at).toISOString().split('T')[0], r.status].join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="idea_export.csv"');
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.exportCommentCsv = async (req, res) => {
  try {
    const notYetClosed = await checkFinalClosure();
    if (notYetClosed) return res.status(403).json({ error: `Exports are only available after the Final Closure Date (${notYetClosed}).` });

    const { rows } = await pool.query('SELECT id, idea_id, body, created_at FROM comments ORDER BY created_at DESC');
    const headers = ['commentId', 'ideaId', 'content', 'language', 'createdwith'];
    const csvRows = rows.map(r => [r.id, r.idea_id, esc(r.body), 'en', new Date(r.created_at).toISOString().split('T')[0]].join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="comment_export.csv"');
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.exportZip = async (req, res) => {
  try {
    const notYetClosed = await checkFinalClosure();
    if (notYetClosed) {
      return res.status(403).json({ error: `Exports are only available after the Final Closure Date (${notYetClosed}).` });
    }
    const uploadsDir = path.join(__dirname, '../../uploads');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="uploads.zip"');
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);
    if (fs.existsSync(uploadsDir)) {
      archive.directory(uploadsDir, false);
    }
    await archive.finalize();
  } catch (e) { res.status(500).json({ error: e.message }); }
};
