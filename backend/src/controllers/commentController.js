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
  const { ideaId } = req.query;
  if (!ideaId) return res.status(400).json({ error: 'ideaId required' });
  try {
    const { rows } = await pool.query(
      'SELECT c.id, c.body, c.anonymous, c.created_at, c.author_id, COALESCE(u.name, \'Deleted User\') as author FROM comments c LEFT JOIN users u ON c.author_id = u.id WHERE c.idea_id = $1 ORDER BY c.created_at ASC',
      [ideaId]
    );
    const comments = rows.map(r => ({
      id: r.id, body: r.body, anonymous: r.anonymous,
      author: r.anonymous ? 'Anonymous' : r.author,
      date: r.created_at,
      author_id: r.author_id,
    }));
    res.json({ data: comments });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
  const { role, id: userId } = req.user;
  if (role === 'admin') return res.status(403).json({ error: 'Admin cannot comment' });
  if (role === 'qa_manager') return res.status(403).json({ error: 'QA Manager cannot comment' });
  if (role === 'qa_coordinator') return res.status(403).json({ error: 'QA Coordinator cannot comment' });
  const { ideaId, body, anonymous } = req.body;
  if (!ideaId || !body) return res.status(400).json({ error: 'ideaId and body required' });
  // Only staff can post anonymously
  const anonBool = (anonymous === true || anonymous === 'true') && role === 'staff';
  try {
    const closureResult = await pool.query("SELECT date FROM closure_dates WHERE label = 'Final Closure Date' ORDER BY date DESC LIMIT 1");
    if (closureResult.rows[0] && new Date() > new Date(closureResult.rows[0].date)) {
      return res.status(403).json({ error: 'The Final Closure Date has passed. No new comments can be posted.' });
    }
  } catch (_) { /* continue if closure date check fails */ }
  try {
    const { rows } = await pool.query(
      'INSERT INTO comments (idea_id, author_id, body, anonymous) VALUES ($1,$2,$3,$4) RETURNING id, body, anonymous, created_at',
      [ideaId, userId, body, anonBool]
    );
    const comment = rows[0];
    // Notify idea author (in-app + email)
    const ideaResult = await pool.query('SELECT author_id, title FROM ideas WHERE id = $1', [ideaId]);
    if (ideaResult.rows[0] && ideaResult.rows[0].author_id !== null && ideaResult.rows[0].author_id !== userId) {
      const commenterName = anonBool ? 'Anonymous' : req.user.name;
      const ideaTitle = ideaResult.rows[0].title;
      const authorId = ideaResult.rows[0].author_id;
      await pool.query(
        'INSERT INTO notifications (user_id, type, message, idea_id) VALUES ($1,$2,$3,$4)',
        [authorId, 'comment', `${commenterName} commented on your idea "${ideaTitle}"`, ideaId]
      );
      const authorResult = await pool.query('SELECT email, name FROM users WHERE id = $1', [authorId]);
      if (authorResult.rows[0]) {
        const { email: authorEmail, name: authorName } = authorResult.rows[0];
        await sendEmail(
          authorEmail,
          `New Comment on Your Idea — "${ideaTitle}"`,
          `Hello ${authorName},\n\nYou have received a new comment on your idea "${ideaTitle}".\n\nComment by: ${commenterName}\n\nPlease log in to the portal to read the comment.\n\nUniversity Ideas Portal`,
          `<p>Hello <strong>${authorName}</strong>,</p><p>You have received a new comment on your idea <strong>"${ideaTitle}"</strong>.</p><p><strong>Comment by:</strong> ${commenterName}</p><p>Please log in to the portal to read the comment.</p><p>University Ideas Portal</p>`
        );
      }
    }
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [userId, 'COMMENT_POST', `Posted comment on idea ${ideaId}`]);
    res.json({
      data: {
        id: comment.id, body: comment.body, anonymous: comment.anonymous,
        author: anonBool ? 'Anonymous' : req.user.name,
        author_id: userId,
        date: comment.created_at,
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { role, id: userId } = req.user;
  if (role !== 'staff') return res.status(403).json({ error: 'Only staff can edit comments' });
  try {
    const { rows } = await pool.query('SELECT * FROM comments WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Comment not found' });
    if (rows[0].author_id !== userId) return res.status(403).json({ error: 'Cannot edit others\' comments' });
    const { body } = req.body;
    await pool.query('UPDATE comments SET body = $1 WHERE id = $2', [body, id]);
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [userId, 'COMMENT_EDIT', `Edited comment ${id}`]);
    res.json({ data: { message: 'Updated' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  const { role, id: userId } = req.user;
  if (role !== 'staff') return res.status(403).json({ error: 'Only staff can delete comments' });
  try {
    const { rows } = await pool.query('SELECT * FROM comments WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Comment not found' });
    if (rows[0].author_id !== userId) return res.status(403).json({ error: 'Cannot delete others\' comments' });
    await pool.query('DELETE FROM comments WHERE id = $1', [id]);
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [userId, 'COMMENT_DELETE', `Deleted comment ${id}`]);
    res.json({ data: { message: 'Deleted' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
