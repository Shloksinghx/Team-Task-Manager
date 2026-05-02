import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import TaskCard from '../components/TaskCard';

export default function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/tasks/dashboard')
      .then((r) => setTasks(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const isOverdue = (t) => t.due_date && t.status !== 'done' && new Date(t.due_date) < now;

  const stats = {
    total: tasks.length,
    inProgress: tasks.filter((t) => t.status === 'in-progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
    overdue: tasks.filter(isOverdue).length,
  };

  const filtered = tasks.filter((t) => {
    if (filter === 'todo') return t.status === 'todo';
    if (filter === 'in-progress') return t.status === 'in-progress';
    if (filter === 'done') return t.status === 'done';
    if (filter === 'overdue') return isOverdue(t);
    return true;
  });

  const initials = user?.name?.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <div className="main-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Good {getGreeting()}, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="page-subtitle">Here's what's on your plate today.</p>
        </div>
        <Link to="/projects" className="btn btn-primary">
          + New Project
        </Link>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <button className={`stat-card stat-primary`} onClick={() => setFilter('all')} style={{ textAlign: 'left', cursor: 'pointer', border: filter === 'all' ? '1px solid var(--primary)' : undefined }}>
          <div className="stat-label">Total Tasks</div>
          <div className="stat-value">{stats.total}</div>
        </button>
        <button className={`stat-card stat-info`} onClick={() => setFilter('in-progress')} style={{ textAlign: 'left', cursor: 'pointer', border: filter === 'in-progress' ? '1px solid var(--info)' : undefined }}>
          <div className="stat-label">In Progress</div>
          <div className="stat-value">{stats.inProgress}</div>
        </button>
        <button className={`stat-card stat-success`} onClick={() => setFilter('done')} style={{ textAlign: 'left', cursor: 'pointer', border: filter === 'done' ? '1px solid var(--success)' : undefined }}>
          <div className="stat-label">Completed</div>
          <div className="stat-value">{stats.done}</div>
        </button>
        <button className={`stat-card stat-danger`} onClick={() => setFilter('overdue')} style={{ textAlign: 'left', cursor: 'pointer', border: filter === 'overdue' ? '1px solid var(--danger)' : undefined }}>
          <div className="stat-label">Overdue</div>
          <div className="stat-value">{stats.overdue}</div>
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-8 mb-16" style={{ flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All Tasks' },
          { key: 'todo', label: 'To Do' },
          { key: 'in-progress', label: 'In Progress' },
          { key: 'done', label: 'Done' },
          { key: 'overdue', label: '⚠ Overdue' },
        ].map((f) => (
          <button
            key={f.key}
            className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tasks */}
      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            {filter === 'overdue' ? '🎉' : '📋'}
          </div>
          <div className="empty-title">
            {filter === 'overdue' ? 'No overdue tasks!' : 'No tasks here'}
          </div>
          <p>
            {filter === 'all'
              ? 'You have no tasks yet. Join or create a project to get started.'
              : `No tasks with status "${filter}".`}
          </p>
          {filter === 'all' && (
            <Link to="/projects" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
              Browse Projects
            </Link>
          )}
        </div>
      ) : (
        <div className="grid-2">
          {filtered.map((task) => (
            <TaskCard key={task.id} task={task} showProject />
          ))}
        </div>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
