const pool = require('../config/db');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const sendEmail = async (to, subject, text, html) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text, html });
  } catch (err) {
    console.warn('Email send failed:', err.message);
  }
};

exports.list = async (req, res) => {
  const { sort = 'latest', page = 0, perPage = 5, category, search, department } = req.query;
  const offset = parseInt(page) * parseInt(perPage);
  const limit = parseInt(perPage);

  let orderBy = 'i.created_at DESC';
  if (sort === 'popular') orderBy = '(SELECT COUNT(*) FROM votes WHERE idea_id = i.id AND value = 1) - (SELECT COUNT(*) FROM votes WHERE idea_id = i.id AND value = -1) DESC, i.created_at DESC';
  else if (sort === 'views') orderBy = 'i.views DESC';
  else if (sort === 'comments') orderBy = 'comment_count DESC';

  const conditions = [];
  const params = [];
  let pIdx = 1;

  if (category) {
    conditions.push(`EXISTS (SELECT 1 FROM idea_categories ic WHERE ic.idea_id = i.id AND ic.category_id = $${pIdx})`);
    params.push(parseInt(category));
    pIdx++;
  }
  if (search) {
    conditions.push(`(i.title ILIKE $${pIdx} OR i.body ILIKE $${pIdx})`);
    params.push(`%${search}%`);
    pIdx++;
  }
  if (department) {
    if (req.user && req.user.role === 'qa_coordinator' && department !== req.user.department) {
      return res.status(403).json({ error: 'Can only view ideas from your own department' });
    }
    conditions.push(`d.name = $${pIdx}`);
    params.push(department);
    pIdx++;
  } else if (req.user && req.user.role === 'qa_coordinator') {
    conditions.push(`i.department_id = $${pIdx}`);
    params.push(req.user.department_id);
    pIdx++;
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const baseQuery = `
    SELECT i.id, i.author_id, i.title, i.body, i.anonymous, i.status, i.views, i.created_at,
      i.department_id,
      COALESCE(u.name, 'Deleted User') as author_name,
      d.name as author_dept,
      (SELECT COUNT(*) FROM votes WHERE idea_id = i.id AND value = 1) as thumbs_up,
      (SELECT COUNT(*) FROM votes WHERE idea_id = i.id AND value = -1) as thumbs_down,
      COUNT(DISTINCT c.id) as comment_count
    FROM ideas i
    LEFT JOIN users u ON i.author_id = u.id
    LEFT JOIN departments d ON i.department_id = d.id
    LEFT JOIN comments c ON c.idea_id = i.id
    ${whereClause}
    GROUP BY i.id, u.name, d.name
    ORDER BY ${orderBy}
  `;

  try {
    const countQuery = `SELECT COUNT(*) FROM (${baseQuery}) sub`;
    const { rows: countRows } = await pool.query(countQuery, params);
    const total = parseInt(countRows[0].count);

    const dataQuery = `${baseQuery} LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
    const { rows } = await pool.query(dataQuery, [...params, limit, offset]);

    const userId = req.user ? req.user.id : null;

    const ideas = await Promise.all(rows.map(async (row) => {
      const catsResult = await pool.query(
        'SELECT category_id FROM idea_categories WHERE idea_id = $1',
        [row.id]
      );
      const attResult = await pool.query(
        'SELECT id, filename, filepath FROM attachments WHERE idea_id = $1',
        [row.id]
      );
      let userVote = null;
      if (userId) {
        const voteResult = await pool.query(
          'SELECT value FROM votes WHERE idea_id = $1 AND user_id = $2',
          [row.id, userId]
        );
        if (voteResult.rows[0]) {
          userVote = voteResult.rows[0].value === 1 ? 'up' : 'down';
        }
      }
      return {
        id: row.id,
        author_id: row.author_id,
        title: row.title,
        body: row.body,
        anonymous: row.anonymous,
        status: row.status,
        views: row.views,
        date: row.created_at,
        author: row.author_name,
        department: row.author_dept,
        department_id: row.department_id,
        thumbsUp: parseInt(row.thumbs_up),
        thumbsDown: parseInt(row.thumbs_down),
        votes: parseInt(row.thumbs_up) - parseInt(row.thumbs_down),
        comments: parseInt(row.comment_count),
        hasVoted: userVote,
        categories: catsResult.rows.map(r => r.category_id),
        attachments: attResult.rows,
      };
    }));

    res.json({ data: ideas, total });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.get = async (req, res) => {
  const { id } = req.params;
  const userId = req.user ? req.user.id : null;
  try {
    // Only increment view count if viewer is NOT the author
    const ideaCheck = await pool.query('SELECT author_id FROM ideas WHERE id = $1', [id]);
    if (ideaCheck.rows[0] && ideaCheck.rows[0].author_id !== userId) {
      await pool.query('UPDATE ideas SET views = views + 1 WHERE id = $1', [id]);
    }
    const { rows } = await pool.query(`
      SELECT i.*, COALESCE(u.name, 'Deleted User') as author_name, d.name as author_dept,
        (SELECT COUNT(*) FROM votes WHERE idea_id = i.id AND value = 1) as thumbs_up,
        (SELECT COUNT(*) FROM votes WHERE idea_id = i.id AND value = -1) as thumbs_down,
        (SELECT COUNT(*) FROM comments WHERE idea_id = i.id) as comment_count
      FROM ideas i
      LEFT JOIN users u ON i.author_id = u.id
      LEFT JOIN departments d ON i.department_id = d.id
      WHERE i.id = $1
      GROUP BY i.id, u.name, d.name
    `, [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Idea not found' });
    const row = rows[0];
    const catsResult = await pool.query('SELECT category_id FROM idea_categories WHERE idea_id = $1', [id]);
    const attResult = await pool.query('SELECT id, filename, filepath FROM attachments WHERE idea_id = $1', [id]);
    let userVote = null;
    if (userId) {
      const voteResult = await pool.query('SELECT value FROM votes WHERE idea_id = $1 AND user_id = $2', [id, userId]);
      if (voteResult.rows[0]) userVote = voteResult.rows[0].value === 1 ? 'up' : 'down';
    }
    res.json({
      data: {
        id: row.id, author_id: row.author_id, title: row.title, body: row.body, anonymous: row.anonymous,
        status: row.status, views: row.views, date: row.created_at,
        author: row.author_name, department: row.author_dept, department_id: row.department_id,
        thumbsUp: parseInt(row.thumbs_up),
        thumbsDown: parseInt(row.thumbs_down),
        votes: parseInt(row.thumbs_up) - parseInt(row.thumbs_down),
        comments: parseInt(row.comment_count),
        hasVoted: userVote,
        categories: catsResult.rows.map(r => r.category_id),
        attachments: attResult.rows,
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
  const { role } = req.user;
  // Only staff can submit ideas (QA Coordinator can no longer submit per feedback-part-6)
  if (role !== 'staff') {
    return res.status(403).json({ error: 'Only staff can submit ideas' });
  }
  const { title, body, anonymous, categoryIds } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Title and body required' });
  try {
    const closureResult = await pool.query("SELECT date FROM closure_dates WHERE label = 'Ideas Closure Date' ORDER BY date DESC LIMIT 1");
    if (closureResult.rows[0] && new Date() > new Date(closureResult.rows[0].date)) {
      return res.status(403).json({ error: 'The Ideas Closure Date has passed. No new ideas can be submitted.' });
    }
  } catch (_) { /* continue if closure date check fails */ }
  const anonBool = anonymous === 'true' || anonymous === true;
  try {
    const { rows } = await pool.query(
      'INSERT INTO ideas (title, body, author_id, department_id, anonymous, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [title, body, req.user.id, req.user.department_id || null, anonBool, 'open']
    );
    const ideaId = rows[0].id;
    if (categoryIds) {
      const ids = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
      for (const catId of ids) {
        await pool.query('INSERT INTO idea_categories (idea_id, category_id) VALUES ($1,$2)', [ideaId, parseInt(catId)]);
      }
    }
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await pool.query(
          'INSERT INTO attachments (idea_id, filename, filepath) VALUES ($1,$2,$3)',
          [ideaId, file.originalname, `uploads/${file.filename}`]
        );
      }
    }
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [req.user.id, 'IDEA_CREATE', `Created idea: ${title}`]);
    // Notify QA Coordinator of the department (in-app + email)
    if (req.user.department_id) {
      const deptResult = await pool.query(
        'SELECT qa_coordinator_id FROM departments WHERE id = $1',
        [req.user.department_id]
      );
      const coordinatorId = deptResult.rows[0]?.qa_coordinator_id;
      if (coordinatorId && coordinatorId !== req.user.id) {
        await pool.query(
          'INSERT INTO notifications (user_id, type, message, idea_id) VALUES ($1,$2,$3,$4)',
          [coordinatorId, 'new_idea', `Ne6w idea submitted in ${req.user.department}: "${title}" by ${anonBool ? 'Anonymous' : req.user.name}`, ideaId]
        );
        const coordResult = await pool.query('SELECT email, name FROM users WHERE id = $1', [coordinatorId]);
        if (coordResult.rows[0]) {
          const { email: coordEmail, name: coordName } = coordResult.rows[0];
          const submitter = anonBool ? 'Anonymous' : req.user.name;
          await sendEmail(
            coordEmail,
            `New Idea Submitted — ${req.user.department}`,
            `Hello ${coordName},\n\nA new idea has been submitted in your department.\n\nTitle: "${title}"\nSubmitted by: ${submitter}\n\nPlease log in to the portal to review it.\n\nUniversity Ideas Portal`,
            `<p>Hello <strong>${coordName}</strong>,</p><p>A new idea has been submitted in your department.</p><p><strong>Title:</strong> "${title}"<br><strong>Submitted by:</strong> ${submitter}</p><p>Please log in to the portal to review it.</p><p>University Ideas Portal</p>`
          );
        }
      }
    }
    res.json({ data: { id: ideaId, title, body } });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { role, id: userId } = req.user;
  try {
    const { rows } = await pool.query('SELECT * FROM ideas WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Idea not found' });
    const idea = rows[0];
    if (role === 'admin') return res.status(403).json({ error: 'Admin cannot edit ideas' });
    if (role === 'qa_coordinator' || role === 'qa_manager') return res.status(403).json({ error: 'Forbidden' });
    if (role === 'staff' && idea.author_id !== userId) return res.status(403).json({ error: 'Cannot edit others\' ideas' });
    if (role === 'staff') {
      const closureResult = await pool.query("SELECT date FROM closure_dates WHERE label = 'Ideas Closure Date' ORDER BY date DESC LIMIT 1");
      if (closureResult.rows[0] && new Date() > new Date(closureResult.rows[0].date)) {
        return res.status(403).json({ error: 'The Ideas Closure Date has passed. You cannot edit ideas.' });
      }
    }
    const { title, body, categoryIds } = req.body;
    await pool.query('UPDATE ideas SET title = $1, body = $2 WHERE id = $3', [title || idea.title, body || idea.body, id]);
    if (categoryIds !== undefined) {
      await pool.query('DELETE FROM idea_categories WHERE idea_id = $1', [id]);
      const ids = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
      for (const catId of ids) {
        await pool.query('INSERT INTO idea_categories (idea_id, category_id) VALUES ($1,$2)', [id, parseInt(catId)]);
      }
    }
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [userId, 'IDEA_UPDATE', `Updated idea ${id}`]);
    res.json({ data: { message: 'Updated' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  const { role, id: userId, department_id } = req.user;
  try {
    const { rows } = await pool.query('SELECT * FROM ideas WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Idea not found' });
    const idea = rows[0];
    if (role === 'staff' && idea.author_id !== userId) return res.status(403).json({ error: 'Cannot delete others\' ideas' });
    if (role === 'staff' && idea.author_id === userId) {
      const closureResult = await pool.query("SELECT date FROM closure_dates WHERE label = 'Ideas Closure Date' ORDER BY date DESC LIMIT 1");
      if (closureResult.rows[0] && new Date() > new Date(closureResult.rows[0].date)) {
        return res.status(403).json({ error: 'The Ideas Closure Date has passed. You cannot delete ideas.' });
      }
    }
    if (role === 'qa_coordinator') {
      if (idea.department_id !== department_id) {
        return res.status(403).json({ error: 'Can only delete ideas from your department' });
      }
    }
    if (role === 'qa_manager') return res.status(403).json({ error: 'Forbidden' });
    await pool.query('DELETE FROM ideas WHERE id = $1', [id]);
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [userId, 'IDEA_DELETE', `Deleted idea ${id}`]);
    res.json({ data: { message: 'Deleted' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
