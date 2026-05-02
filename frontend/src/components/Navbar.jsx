import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ?.split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span>⚡</span>
        TaskFlow
      </div>

      <div className="navbar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/projects"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          Projects
        </NavLink>
      </div>

      <div className="navbar-user">
        <div className="user-avatar">{initials}</div>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user?.name}</span>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
