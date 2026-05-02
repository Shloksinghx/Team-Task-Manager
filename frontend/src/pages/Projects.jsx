import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';

function ProjectCard({ project, onClick }) {
  const pct = project.task_count > 0
    ? Math.round((project.done_count / project.task_count) * 100)
    : 0;

  return (
    <div className="card card-hover" onClick={onClick}>
      <div className="flex-between mb-8">
        <h3 style={{ fontWeight: 700, fontSize: 16 }}>{project.name}</h3>
        <span className={`badge ${project.user_role === 'admin' ? 'badge-admin' : 'badge-member'}`}>
          {project.user_role}
        </span>
      </div>

      {project.description && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
          {project.description.length > 100 ? project.description.slice(0, 100) + '…' : project.description}
        </p>
      )}

      <div className="flex gap-12 text-muted text-sm" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        <span>👥 {project.member_count} member{project.member_count !== 1 ? 's' : ''}</span>
        <span>📋 {project.task_count} task{project.task_count !== 1 ? 's' : ''}</span>
        <span>✅ {project.done_count} done</span>
      </div>

      <div>
        <div className="flex-between text-sm text-muted mb-4">
          <span>Progress</span>
          <span>{pct}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchProjects = () => {
    setLoading(true);
    api.get('/projects')
      .then((r) => setProjects(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(fetchProjects, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/projects', form);
      setShowModal(false);
      setForm({ name: '', description: '' });
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Manage your teams and track progress</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Project
        </button>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🚀</div>
          <div className="empty-title">No projects yet</div>
          <p>Create your first project and invite your team members.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid-2">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onClick={() => navigate(`/projects/${p.id}`)} />
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title="Create New Project"
          onClose={() => { setShowModal(false); setError(''); setForm({ name: '', description: '' }); }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Project'}
              </button>
            </>
          }
        >
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="label">Project Name *</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Website Redesign"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="label">Description</label>
              <textarea
                className="textarea"
                placeholder="Brief description of the project…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
