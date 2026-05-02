const STATUS_LABELS = { todo: 'To Do', 'in-progress': 'In Progress', done: 'Done' };
const STATUS_CLASSES = { todo: 'badge-todo', 'in-progress': 'badge-inprogress', done: 'badge-done' };
const PRIORITY_CLASSES = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high' };

function isOverdue(task) {
  return task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();
}

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TaskCard({ task, onEdit, onDelete, showProject }) {
  const overdue = isOverdue(task);

  return (
    <div className="task-card">
      <div className="task-card-header">
        <div>
          <div className="task-card-title">{task.title}</div>
          {task.description && (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
              {task.description.length > 80 ? task.description.slice(0, 80) + '…' : task.description}
            </div>
          )}
        </div>
        {(onEdit || onDelete) && (
          <div className="task-card-actions">
            {onEdit && (
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(task)} title="Edit">✏️</button>
            )}
            {onDelete && (
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDelete(task)} title="Delete">🗑️</button>
            )}
          </div>
        )}
      </div>

      <div className="task-card-meta">
        <span className={`badge ${STATUS_CLASSES[task.status]}`}>
          {STATUS_LABELS[task.status]}
        </span>
        <span className={`badge ${PRIORITY_CLASSES[task.priority]}`}>
          {task.priority}
        </span>
        {overdue && <span className="badge badge-overdue">⚠ Overdue</span>}
        {showProject && task.project_name && (
          <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid rgba(99,102,241,0.3)' }}>
            {task.project_name}
          </span>
        )}
      </div>

      <div className="flex gap-12 mt-8" style={{ flexWrap: 'wrap' }}>
        {task.assigned_to_name && (
          <div className="flex gap-8 text-sm text-muted">
            <span>👤</span>
            <span>{task.assigned_to_name}</span>
          </div>
        )}
        {task.due_date && (
          <div className={`flex gap-8 text-sm ${overdue ? '' : 'text-muted'}`} style={overdue ? { color: 'var(--danger)' } : {}}>
            <span>📅</span>
            <span>{formatDate(task.due_date)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
