import { useState } from 'react';
import Icon from './Icon';
import NotificationBell from './NotificationBell.jsx';
import ChangePasswordModal from './ChangePasswordModal.jsx';

const roleColors = { staff: 'av-staff', qa_coordinator: 'av-coord', qa_manager: 'av-manager', admin: 'av-admin' };
const roleLabels = { staff: 'Staff', qa_coordinator: 'QA Coordinator', qa_manager: 'QA Manager', admin: 'Administrator' };

const navItems = [
  { id: 'dashboard', icon: 'home', label: 'Dashboard', roles: ['staff', 'qa_coordinator', 'qa_manager', 'admin'] },
  { id: 'ideas', icon: 'idea', label: 'Browse Ideas', roles: ['staff', 'qa_coordinator', 'qa_manager', 'admin'] },
  { id: 'statistics', icon: 'chart', label: 'Statistics', roles: ['qa_manager'] },
  { id: 'categories', icon: 'tag', label: 'Categories', roles: ['qa_manager'] },
  { id: 'download', icon: 'download', label: 'Export Data', roles: ['qa_manager'] },
  { id: 'admin', icon: 'settings', label: 'Administration', roles: ['admin'] },
];

export default function Layout({ user, page, setPage, onLogout, onNavigateToIdea, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const visibleNav = navItems.filter(n => n.roles.includes(user.role));
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2);

  const isQAManager = user.role === 'qa_manager';
  const isReportsPage = page === 'statistics' || page === 'exception-reports';

  const handleNavClick = (id) => {
    setPage(id);
    setSidebarOpen(false);
  };

  const handleReportsClick = (id) => {
    setPage(id);
    setSidebarOpen(false);
  };

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-brand">
          <button className={`hamburger ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle menu">
            <span /><span /><span />
          </button>
          <div className="nav-logo">U</div>
          <div>
            <div className="nav-title">Ideas for Improvement</div>
            <div className="nav-subtitle">Quality Assurance Portal</div>
          </div>
        </div>
        <div className="nav-actions">
          <NotificationBell user={user} onNavigateToIdea={onNavigateToIdea} />
          <div className="nav-user">
            <span className="nav-user-name">{user.name}</span>
            <span className="role-badge">{roleLabels[user.role]}</span>
          </div>
          <button className="btn-ghost" onClick={onLogout}>
            <Icon name="logout" size={14} /> Sign Out
          </button>
        </div>
      </nav>

      
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
    </div>
  );
}
