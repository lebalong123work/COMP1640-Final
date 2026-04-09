const pool = require('../config/db');

exports.vote = async (req, res) => {
  const { ideaId, value } = req.body;
  const userId = req.user.id;
  const { role } = req.user;

  if (role !== 'staff') {
    return res.status(403).json({ error: 'Only staff can vote' });
  }

  try {
    const existing = await pool.query('SELECT value FROM votes WHERE idea_id = $1 AND user_id = $2', [ideaId, userId]);
    const idea = await pool.query('SELECT author_id, title FROM ideas WHERE id = $1', [ideaId]);
    const voter = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);

    if (existing.rows.length > 0) {
      if (existing.rows[0].value === value) {
        // Same vote → remove (toggle off)
        await pool.query('DELETE FROM votes WHERE idea_id = $1 AND user_id = $2', [ideaId, userId]);
      } else {
        // Different vote → change
        await pool.query('UPDATE votes SET value = $1 WHERE idea_id = $2 AND user_id = $3', [value, ideaId, userId]);
        // Notify author on vote change too
        if (idea.rows[0] && idea.rows[0].author_id && idea.rows[0].author_id !== userId) {
          const voteMsg = value === 1
            ? `${voter.rows[0]?.name || 'Someone'} liked your idea "${idea.rows[0].title}"`
            : `${voter.rows[0]?.name || 'Someone'} disliked your idea "${idea.rows[0].title}"`;
          await pool.query(
            'INSERT INTO notifications (user_id, type, message, idea_id) VALUES ($1, $2, $3, $4)',
            [idea.rows[0].author_id, 'vote', voteMsg, ideaId]
          );
        }
      }
    } else {
      await pool.query('INSERT INTO votes (idea_id, user_id, value) VALUES ($1, $2, $3)', [ideaId, userId, value]);
      if (idea.rows[0] && idea.rows[0].author_id && idea.rows[0].author_id !== userId) {
        const voteMsg = value === 1
          ? `${voter.rows[0]?.name || 'Someone'} liked your idea "${idea.rows[0].title}"`
          : `${voter.rows[0]?.name || 'Someone'} disliked your idea "${idea.rows[0].title}"`;
        await pool.query(
          'INSERT INTO notifications (user_id, type, message, idea_id) VALUES ($1, $2, $3, $4)',
          [idea.rows[0].author_id, 'vote', voteMsg, ideaId]
        );
      }
    }

    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [userId, 'VOTE_CAST', `Voted on idea ${ideaId} with value ${value}`]);

    const counts = await pool.query(`
      SELECT
        COUNT(CASE WHEN value = 1 THEN 1 END) as thumbs_up,
        COUNT(CASE WHEN value = -1 THEN 1 END) as thumbs_down
      FROM votes WHERE idea_id = $1
    `, [ideaId]);
    const userVote = await pool.query('SELECT value FROM votes WHERE idea_id = $1 AND user_id = $2', [ideaId, userId]);
    const uv = userVote.rows[0] ? (userVote.rows[0].value === 1 ? 'up' : 'down') : null;

    res.json({
      data: {
        thumbsUp: parseInt(counts.rows[0].thumbs_up),
        thumbsDown: parseInt(counts.rows[0].thumbs_down),
        userVote: uv
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
