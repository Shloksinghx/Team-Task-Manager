import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import TaskCard from '../components/TaskCard';
import Modal from '../components/Modal';

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: 'var(--text-muted)' },
  { key: 'in-progress', label: 'In Progress', color: 'var(--info)' },
  { key: 'done', label: 'Done', color: 'var(--success)' },
];

const emptyTask = {
  title: '', description: '', status: 'todo',
  priority: 'medium', assigned_to: '', due_date: '',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Task modal
  const [taskModal, setTaskModal] = useState(null); // null | 'create' | task object
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [taskError, setTaskError] = useState('');
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // Member modal
  const [memberModal, setMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [memberError, setMemberError] = useState('');
  const [memberSubmitting, setMemberSubmitting] = useState(false);

  // Edit project modal
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  const fetchProject = useCallback(() => {
    api.get(`/projects/${id}`)
      .then((r) => {
        setProject(r.data);
        setEditForm({ name: r.data.name, description: r.data.description || '' });
      })
      .catch(() => navigate('/projects'));
  }, [id, navigate]);

  const fetchTasks = useCallback(() => {
    api.get(`/tasks/project/${id}`)
      .then((r) => setTasks(r.data))
      .catch(console.error);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchProject(), fetchTasks()]).finally(() => setLoading(false));
  }, [fetchProject, fetchTasks]);

  const isAdmin = project?.user_role === 'admin';

  // ---- TASK CRUD ----
  const openCreateTask = () => {
    setTaskForm(emptyTask);
    setTaskError('');
    setTaskModal('create');
  };

  const openEditTask = (task) => {
    setTaskForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      assigned_to: task.assigned_to || '',
      due_date: task.due_date ? task.due_date.slice(0, 10) : '',
    });
    setTaskError('');
    setTaskModal(task);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    setTaskError('');
    setTaskSubmitting(true);
    try {
      const payload = { ...taskForm, project_id: id, assigned_to: taskForm.assigned_to || null, due_date: taskForm.due_date || null };
      if (taskModal === 'create') {
        await api.post('/tasks', payload);
      } else {
        await api.put(`/tasks/${taskModal.id}`, payload);
      }
      setTaskModal(null);
      fetchTasks();
    } catch (err) {
      setTaskError(err.response?.data?.error || 'Failed to save task');
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete task');
    }
  };

  // ---- MEMBER MANAGEMENT ----
  const handleAddMember = async (e) => {
    e.preventDefault();
    setMemberError('');
    setMemberSubmitting(true);
    try {
      await api.post(`/projects/${id}/members`, { email: memberEmail, role: memberRole });
      setMemberModal(false);
      setMemberEmail('');
      fetchProject();
    } catch (err) {
      setMemberError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setMemberSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this project?`)) return;
    try {
      await api.delete(`/projects/${id}/members/${memberId}`);
      fetchProject();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove member');
    }
  };

  // ---- EDIT PROJECT ----
  const handleEditProject = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/projects/${id}`, editForm);
      setEditModal(false);
      fetchProject();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update project');
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`Permanently delete project "${project.name}" and all its tasks?`)) return;
    try {
      await api.delete(`/projects/${id}`);
      navigate('/projects');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete project');
    }
  };

  const tasksByStatus = (status) => tasks.filter((t) => t.status === status);
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  if (loading) return <div className="loading-screen" style={{ minHeight: '80vh' }}><div className="spinner" /></div>;
  if (!project) return null;

  return (
    <div className="main-content">
      {/* Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>← Back</button>
          <div>
            <h1 className="page-title">{project.name}</h1>
            {project.description && <p className="page-subtitle">{project.description}</p>}
          </div>
          <span className={`badge ${isAdmin ? 'badge-admin' : 'badge-member'}`}>{project.user_role}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isAdmin && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditModal(true)}>✏️ Edit</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setMemberModal(true)}>👥 Add Member</button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}>🗑️ Delete</button>
            </>
          )}
          <button className="btn btn-primary" onClick={openCreateTask}>+ New Task</button>
        </div>
      </div>

      {/* Progress */}
      <div className="card mb-16" style={{ marginBottom: 20 }}>
        <div className="flex-between mb-8">
          <span style={{ fontWeight: 600 }}>Overall Progress</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{doneTasks}/{totalTasks} tasks done · {pct}%</span>
        </div>
        <div className="progress-bar" style={{ height: 8, borderRadius: 4 }}>
          <div className="progress-fill" style={{ width: `${pct}%`, borderRadius: 4 }} />
        </div>
      </div>

      {/* Members */}
      <details style={{ marginBottom: 20 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>👥</span> Team Members ({project.members?.length || 0})
        </summary>
        <div className="card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none' }}>
          {project.members?.map((m) => (
            <div key={m.id} className="member-item">
              <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                {m.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="member-info">
                <div className="member-name">{m.name} {m.id === user?.id && <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>(you)</span>}</div>
                <div className="member-email">{m.email}</div>
              </div>
              <span className={`badge ${m.role === 'admin' ? 'badge-admin' : 'badge-member'}`}>{m.role}</span>
              {isAdmin && m.id !== user?.id && (
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleRemoveMember(m.id, m.name)} title="Remove member">✕</button>
              )}
            </div>
          ))}
        </div>
      </details>

      {/* Kanban Board */}
      <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Tasks</h2>
      <div className="kanban-board">
        {COLUMNS.map((col) => {
          const colTasks = tasksByStatus(col.key);
          return (
            <div key={col.key} className="kanban-col">
              <div className="kanban-col-header">
                <span className="kanban-col-title" style={{ color: col.color }}>{col.label}</span>
                <span className="col-count">{colTasks.length}</span>
              </div>
              <div className="kanban-tasks">
                {colTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)', fontSize: 12 }}>
                    No tasks
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={openEditTask}
                      onDelete={(isAdmin || task.created_by === user?.id) ? handleDeleteTask : null}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Modal */}
      {taskModal !== null && (
        <Modal
          title={taskModal === 'create' ? 'Create Task' : 'Edit Task'}
          onClose={() => setTaskModal(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setTaskModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleTaskSubmit} disabled={taskSubmitting}>
                {taskSubmitting ? 'Saving…' : (taskModal === 'create' ? 'Create Task' : 'Save Changes')}
              </button>
            </>
          }
        >
          {taskError && <div className="alert alert-error">{taskError}</div>}
          <form onSubmit={handleTaskSubmit}>
            <div className="form-group">
              <label className="label">Title *</label>
              <input className="input" type="text" placeholder="Task title" value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required autoFocus />
            </div>
            <div className="form-group">
              <label className="label">Description</label>
              <textarea className="textarea" placeholder="Optional details…" value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows={3} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="label">Status</label>
                <select className="input select" value={taskForm.status}
                  onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Priority</label>
                <select className="input select" value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="label">Assign To</label>
                <select className="input select" value={taskForm.assigned_to}
                  onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}>
                  <option value="">Unassigned</option>
                  {project.members?.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Due Date</label>
                <input className="input" type="date" value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Member Modal */}
      {memberModal && (
        <Modal
          title="Add Team Member"
          onClose={() => { setMemberModal(false); setMemberError(''); setMemberEmail(''); }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setMemberModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddMember} disabled={memberSubmitting}>
                {memberSubmitting ? 'Adding…' : 'Add Member'}
              </button>
            </>
          }
        >
          {memberError && <div className="alert alert-error">{memberError}</div>}
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            The person must already have a TaskFlow account.
          </div>
          <form onSubmit={handleAddMember}>
            <div className="form-group">
              <label className="label">Email Address *</label>
              <input className="input" type="email" placeholder="member@example.com" value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label className="label">Role</label>
              <select className="input select" value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
                <option value="member">Member — can create and update tasks</option>
                <option value="admin">Admin — full project control</option>
              </select>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Project Modal */}
      {editModal && (
        <Modal
          title="Edit Project"
          onClose={() => setEditModal(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setEditModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditProject}>Save Changes</button>
            </>
          }
        >
          <form onSubmit={handleEditProject}>
            <div className="form-group">
              <label className="label">Project Name *</label>
              <input className="input" type="text" value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required autoFocus />
            </div>
            <div className="form-group">
              <label className="label">Description</label>
              <textarea className="textarea" value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
