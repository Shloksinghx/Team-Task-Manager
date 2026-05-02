const router = require('express').Router();
const auth = require('../middleware/auth');
const { pool } = require('../db');

const VALID_STATUSES = ['todo', 'in-progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

// GET /api/tasks/dashboard — get all tasks relevant to current user
router.get('/dashboard', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        t.*,
        p.name AS project_name,
        u.name AS assigned_to_name,
        u2.name AS created_by_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN users u2 ON u2.id = t.created_by
      WHERE t.assigned_to = $1 OR t.created_by = $1
      ORDER BY
        CASE WHEN t.due_date < NOW() AND t.status != 'done' THEN 0 ELSE 1 END,
        t.due_date ASC NULLS LAST,
        t.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tasks/project/:projectId — get tasks for a project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const memberCheck = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [req.params.projectId, req.user.id]
    );
    if (!memberCheck.rows.length) return res.status(403).json({ error: 'Access denied' });

    const { status, priority, assigned_to } = req.query;
    let query = `
      SELECT t.*, u.name AS assigned_to_name, u2.name AS created_by_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN users u2 ON u2.id = t.created_by
      WHERE t.project_id = $1
    `;
    const params = [req.params.projectId];

    if (status) { params.push(status); query += ` AND t.status = $${params.length}`; }
    if (priority) { params.push(priority); query += ` AND t.priority = $${params.length}`; }
    if (assigned_to) { params.push(assigned_to); query += ` AND t.assigned_to = $${params.length}`; }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks — create task
router.post('/', auth, async (req, res) => {
  const { project_id, title, description, status = 'todo', priority = 'medium', assigned_to, due_date } = req.body;

  if (!project_id) return res.status(400).json({ error: 'project_id is required' });
  if (!title?.trim()) return res.status(400).json({ error: 'Task title is required' });
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (!VALID_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });

  try {
    const memberCheck = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [project_id, req.user.id]
    );
    if (!memberCheck.rows.length) return res.status(403).json({ error: 'Access denied' });

    // If assigning to someone, verify they're in the project
    if (assigned_to) {
      const assigneeCheck = await pool.query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [project_id, assigned_to]
      );
      if (!assigneeCheck.rows.length) return res.status(400).json({ error: 'Assignee is not a project member' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, due_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [project_id, title.trim(), description?.trim() || null, status, priority, assigned_to || null, due_date || null, req.user.id]
    );

    // Fetch with names
    const task = await pool.query(
      `SELECT t.*, u.name AS assigned_to_name, u2.name AS created_by_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       LEFT JOIN users u2 ON u2.id = t.created_by
       WHERE t.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(task.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tasks/:id — update task
router.put('/:id', auth, async (req, res) => {
  const { title, description, status, priority, assigned_to, due_date } = req.body;

  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (priority && !VALID_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });

  try {
    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!taskResult.rows.length) return res.status(404).json({ error: 'Task not found' });
    const task = taskResult.rows[0];

    const memberCheck = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [task.project_id, req.user.id]
    );
    if (!memberCheck.rows.length) return res.status(403).json({ error: 'Access denied' });

    const updatedTitle = title?.trim() || task.title;
    const updatedDesc = description !== undefined ? description?.trim() || null : task.description;
    const updatedStatus = status || task.status;
    const updatedPriority = priority || task.priority;
    const updatedAssigned = assigned_to !== undefined ? assigned_to || null : task.assigned_to;
    const updatedDue = due_date !== undefined ? due_date || null : task.due_date;

    const result = await pool.query(
      `UPDATE tasks
       SET title = $1, description = $2, status = $3, priority = $4,
           assigned_to = $5, due_date = $6, updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [updatedTitle, updatedDesc, updatedStatus, updatedPriority, updatedAssigned, updatedDue, req.params.id]
    );

    const updated = await pool.query(
      `SELECT t.*, u.name AS assigned_to_name, u2.name AS created_by_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       LEFT JOIN users u2 ON u2.id = t.created_by
       WHERE t.id = $1`,
      [result.rows[0].id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tasks/:id — delete task (admin or task creator)
router.delete('/:id', auth, async (req, res) => {
  try {
    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!taskResult.rows.length) return res.status(404).json({ error: 'Task not found' });
    const task = taskResult.rows[0];

    const memberCheck = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [task.project_id, req.user.id]
    );
    if (!memberCheck.rows.length) return res.status(403).json({ error: 'Access denied' });

    const isAdmin = memberCheck.rows[0].role === 'admin';
    const isCreator = task.created_by === req.user.id;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: 'Only admins or the task creator can delete this task' });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
