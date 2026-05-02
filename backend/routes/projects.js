const router = require('express').Router();
const auth = require('../middleware/auth');
const { pool } = require('../db');

// Helper: check if user is member of project, return role
const getMemberRole = async (projectId, userId) => {
  const res = await pool.query(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return res.rows[0]?.role || null;
};

// GET /api/projects — list all projects for current user
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        p.id, p.name, p.description, p.created_at,
        pm.role AS user_role,
        u.name AS owner_name,
        COUNT(DISTINCT t.id) AS task_count,
        COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) AS done_count,
        COUNT(DISTINCT pm2.user_id) AS member_count
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
      JOIN users u ON u.id = p.owner_id
      LEFT JOIN tasks t ON t.project_id = p.id
      LEFT JOIN project_members pm2 ON pm2.project_id = p.id
      GROUP BY p.id, pm.role, u.name
      ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/projects/:id — get single project with members
router.get('/:id', auth, async (req, res) => {
  try {
    const role = await getMemberRole(req.params.id, req.user.id);
    if (!role) return res.status(403).json({ error: 'Access denied' });

    const project = await pool.query(
      'SELECT p.*, u.name AS owner_name FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.id = $1',
      [req.params.id]
    );
    if (!project.rows.length) return res.status(404).json({ error: 'Project not found' });

    const members = await pool.query(
      `SELECT u.id, u.name, u.email, pm.role
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1
       ORDER BY pm.role DESC, u.name ASC`,
      [req.params.id]
    );

    res.json({ ...project.rows[0], members: members.rows, user_role: role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects — create project
router.post('/', auth, async (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Project name is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const proj = await client.query(
      'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), description?.trim() || null, req.user.id]
    );
    await client.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [proj.rows[0].id, req.user.id, 'admin']
    );
    await client.query('COMMIT');
    res.status(201).json(proj.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT /api/projects/:id — update project (admin only)
router.put('/:id', auth, async (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Project name is required' });

  try {
    const role = await getMemberRole(req.params.id, req.user.id);
    if (role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const result = await pool.query(
      'UPDATE projects SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name.trim(), description?.trim() || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:id — delete project (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const role = await getMemberRole(req.params.id, req.user.id);
    if (role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects/:id/members — add member (admin only)
router.post('/:id/members', auth, async (req, res) => {
  const { email, role = 'member' } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Role must be admin or member' });

  try {
    const myRole = await getMemberRole(req.params.id, req.user.id);
    if (myRole !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const userResult = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (!userResult.rows.length) return res.status(404).json({ error: 'No user found with that email' });

    const targetUser = userResult.rows[0];
    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3',
      [req.params.id, targetUser.id, role]
    );
    res.json({ message: 'Member added', user: targetUser, role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/projects/:id/members/:userId — update member role (admin only)
router.put('/:id/members/:userId', auth, async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Role must be admin or member' });

  try {
    const myRole = await getMemberRole(req.params.id, req.user.id);
    if (myRole !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    await pool.query(
      'UPDATE project_members SET role = $1 WHERE project_id = $2 AND user_id = $3',
      [role, req.params.id, req.params.userId]
    );
    res.json({ message: 'Role updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:id/members/:userId — remove member (admin only)
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const myRole = await getMemberRole(req.params.id, req.user.id);
    if (myRole !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    // Prevent removing the only admin
    const project = await pool.query('SELECT owner_id FROM projects WHERE id = $1', [req.params.id]);
    if (project.rows[0]?.owner_id === parseInt(req.params.userId)) {
      return res.status(400).json({ error: 'Cannot remove the project owner' });
    }

    await pool.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [req.params.id, req.params.userId]
    );
    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
