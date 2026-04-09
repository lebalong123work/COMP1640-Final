const pool = require('../config/db');

exports.getStats = async (req, res) => {
  try {
    const [ideasR, commentsR, contributorsR, viewsR, byDeptR, byCatR, weeklyR, monthlyR, byDeptContribR] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM ideas'),
      pool.query('SELECT COUNT(*) FROM comments'),
      pool.query('SELECT COUNT(DISTINCT author_id) as contributors FROM ideas'),
      pool.query('SELECT COALESCE(SUM(views),0) FROM ideas'),
      pool.query(`
        SELECT d.name as dept, COUNT(i.id) as count
        FROM ideas i
        LEFT JOIN departments d ON i.department_id = d.id
        GROUP BY d.name
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT c.name as cat, COUNT(ic.idea_id) as count
        FROM categories c
        LEFT JOIN idea_categories ic ON ic.category_id = c.id
        GROUP BY c.id, c.name
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT TO_CHAR(created_at, 'IYYY-IW') as week, COUNT(*) as count
        FROM ideas
        WHERE created_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY week
        ORDER BY week
      `),
      pool.query(`
        SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
        FROM ideas
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY month
        ORDER BY month
      `),
      pool.query(`
        SELECT d.name as dept, COUNT(DISTINCT i.author_id) as contributors
        FROM ideas i
        JOIN departments d ON i.department_id = d.id
        GROUP BY d.name
        ORDER BY contributors DESC
      `),
    ]);
    res.json({
      data: {
        totalIdeas: parseInt(ideasR.rows[0].count),
        totalComments: parseInt(commentsR.rows[0].count),
        totalContributors: parseInt(contributorsR.rows[0].contributors),
        totalViews: parseInt(viewsR.rows[0].coalesce),
        byDept: byDeptR.rows.map(r => ({ dept: r.dept, count: parseInt(r.count) })),
        byCategory: byCatR.rows.map(r => ({ cat: r.cat, count: parseInt(r.count) })),
        weeklySubmissions: weeklyR.rows.map(r => ({ week: r.week, count: parseInt(r.count) })),
        monthlySubmissions: monthlyR.rows.map(r => ({ month: r.month, count: parseInt(r.count) })),
        byDeptContributors: byDeptContribR.rows.map(r => ({ dept: r.dept, contributors: parseInt(r.contributors) })),
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getDeptStats = async (req, res) => {
  const { dept } = req.params;
  try {
    const [ideasR, commentsR, votesR, viewsR] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM ideas i JOIN departments d ON i.department_id = d.id WHERE d.name = $1', [dept]),
      pool.query('SELECT COUNT(*) FROM comments c JOIN ideas i ON c.idea_id = i.id JOIN departments d ON i.department_id = d.id WHERE d.name = $1', [dept]),
      pool.query('SELECT COUNT(*) FROM votes v JOIN ideas i ON v.idea_id = i.id JOIN departments d ON i.department_id = d.id WHERE d.name = $1', [dept]),
      pool.query('SELECT COALESCE(SUM(i.views),0) FROM ideas i JOIN departments d ON i.department_id = d.id WHERE d.name = $1', [dept]),
    ]);
    res.json({
      data: {
        totalIdeas: parseInt(ideasR.rows[0].count),
        totalComments: parseInt(commentsR.rows[0].count),
        totalVotes: parseInt(votesR.rows[0].count),
        totalViews: parseInt(viewsR.rows[0].coalesce),
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.ideasWithoutComments = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT i.id, i.title, i.status, i.views, i.created_at, i.anonymous, i.author_id,
        COALESCE(u.name, 'Deleted User') as author_name, d.name as department,
        COALESCE(SUM(v.value), 0) as vote_total
      FROM ideas i
      LEFT JOIN users u ON i.author_id = u.id
      LEFT JOIN departments d ON i.department_id = d.id
      LEFT JOIN votes v ON v.idea_id = i.id
      LEFT JOIN comments c ON c.idea_id = i.id
      GROUP BY i.id, u.name, d.name
      HAVING COUNT(c.id) = 0
      ORDER BY i.created_at DESC
    `);
    res.json({ data: rows.map(r => ({
      id: r.id,
      title: r.title,
      status: r.status,
      views: r.views,
      date: r.created_at,
      author: r.anonymous ? 'Anonymous' : r.author_name,
      department: r.department,
      votes: parseInt(r.vote_total),
    })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.anonymousContent = async (req, res) => {
  try {
    const { rows: ideasRows } = await pool.query(`
      SELECT i.id, i.title as content, i.title as related_idea, i.created_at,
        d.name as department, 'idea' as type
      FROM ideas i
      LEFT JOIN departments d ON i.department_id = d.id
      WHERE i.anonymous = true
      ORDER BY i.created_at DESC
    `);
    const { rows: commentsRows } = await pool.query(`
      SELECT c.id, c.body as content, i.title as related_idea, c.created_at,
        d.name as department, 'comment' as type, i.id as idea_id
      FROM comments c
      LEFT JOIN ideas i ON c.idea_id = i.id
      LEFT JOIN departments d ON i.department_id = d.id
      WHERE c.anonymous = true
      ORDER BY c.created_at DESC
    `);
    res.json({
      data: {
        ideas: ideasRows.map(r => ({ id: r.id, type: 'idea', content: r.content, related_idea: r.related_idea, department: r.department, date: r.created_at, idea_id: r.id })),
        comments: commentsRows.map(r => ({ id: r.id, type: 'comment', content: r.content, related_idea: r.related_idea, department: r.department, date: r.created_at, idea_id: r.idea_id })),
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
