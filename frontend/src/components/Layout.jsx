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

      <div className="layout">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-section">Navigation</div>

          {/* Dashboard */}
          <div className={`nav-item ${page === 'dashboard' ? 'active' : ''}`} onClick={() => handleNavClick('dashboard')}>
            <Icon name="home" size={16} /> Dashboard
          </div>

          {/* Browse Ideas */}
          <div className={`nav-item ${page === 'ideas' ? 'active' : ''}`} onClick={() => handleNavClick('ideas')}>
            <Icon name="idea" size={16} /> Browse Ideas
          </div>

          {/* QA Manager: Reports section with sub-items */}
          {isQAManager && (
            <>
              <div
                className={`nav-item ${isReportsPage ? 'active' : ''}`}
                onClick={() => setReportsOpen(o => !o)}
                style={{ justifyContent: 'space-between' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon name="chart" size={16} /> Reports
                </span>
                <Icon name={reportsOpen || isReportsPage ? 'chevron_down' : 'chevron_right'} size={13} />
              </div>
              {(reportsOpen || isReportsPage) && (
                <div style={{ paddingLeft: '1rem' }}>
                  <div className={`nav-item nav-sub-item ${page === 'statistics' ? 'active' : ''}`} onClick={() => handleReportsClick('statistics')}>
                    <Icon name="chart" size={14} /> Statistics
                  </div>
                  <div className={`nav-item nav-sub-item ${page === 'exception-reports' ? 'active' : ''}`} onClick={() => handleReportsClick('exception-reports')}>
                    <Icon name="alert" size={14} /> Exception Reports
                  </div>
                </div>
              )}
              <div className={`nav-item ${page === 'categories' ? 'active' : ''}`} onClick={() => handleNavClick('categories')}>
                <Icon name="tag" size={16} /> Categories
              </div>
              <div className={`nav-item ${page === 'download' ? 'active' : ''}`} onClick={() => handleNavClick('download')}>
                <Icon name="download" size={16} /> Export Data
              </div>
            </>
          )}

          {/* Admin: Administration only (no Statistics per feedback-part-6) */}
          {user.role === 'admin' && (
            <>
              <div className={`nav-item ${page === 'admin' ? 'active' : ''}`} onClick={() => handleNavClick('admin')}>
                <Icon name="settings" size={16} /> Administration
              </div>
            </>
          )}

          {/* Non-QA-Manager, non-admin items that aren't already handled */}
          {!isQAManager && user.role !== 'admin' && visibleNav.filter(n => !['dashboard', 'ideas'].includes(n.id)).map(item => (
            <div
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <Icon name={item.icon} size={16} /> {item.label}
            </div>
          ))}

          <div style={{ marginTop: '1.5rem', padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className={`user-avatar ${roleColors[user.role]}`} style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: 'white', flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{user.department}</div>
              </div>
            </div>
            {user.role === 'staff' && (
              <button
                onClick={() => setShowChangePw(true)}
                style={{ marginTop: '0.5rem', width: '100%', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-3)', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Icon name="lock" size={12} /> Change Password
              </button>
            )}
          </div>
        </aside>

        <main className="main">
          {children}
        </main>
      </div>
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
    </div>
  );
}
