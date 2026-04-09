import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import Icon from './Icon.jsx';

export default function NotificationBell({ user, onNavigateToIdea }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const load = () => api.get('/api/notifications').then(d => d.data && setNotifications(d.data));

  useEffect(() => {
    if (!['staff', 'qa_coordinator'].includes(user?.role)) return;
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!['staff', 'qa_coordinator'].includes(user?.role)) return null;

  const unread = notifications.filter(n => !n.is_read).length;

  const markRead = async (id, ideaId) => {
    await api.put(`/api/notifications/${id}/read`, {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    if (ideaId && onNavigateToIdea) {
      setOpen(false);
      onNavigateToIdea(ideaId);
    }
  };

  const markAllRead = async () => {
    await api.put('/api/notifications/read-all', {});
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn-ghost"
        onClick={() => setOpen(o => !o)}
        style={{ position: 'relative', padding: '6px 10px' }}
      >
        <Icon name="bell" size={16} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            background: 'var(--red)', color: 'white', borderRadius: '50%',
            width: '16px', height: '16px', fontSize: '0.65rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
      {open && (
        <div style={{
          position: 'fixed', right: '0.75rem', top: '70px',
          width: 'min(320px, calc(100vw - 1.5rem))',
          background: 'white', border: '1px solid var(--border)', borderRadius: '10px',
          boxShadow: 'var(--shadow-lg)', zIndex: 300, overflow: 'hidden'
        }}>
          <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--navy)' }}>Notifications</span>
            {unread > 0 && <button onClick={markAllRead} style={{ fontSize: '0.75rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>}
          </div>
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.875rem' }}>No notifications</div>
            ) : notifications.slice(0, 20).map(n => (
              <div
                key={n.id}
                onClick={() => markRead(n.id, n.idea_id)}
                style={{
                  padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)',
                  background: n.is_read ? 'white' : '#f0f4ff',
                  cursor: 'pointer', transition: 'background 0.15s'
                }}
              >
                <div style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.5 }}>{n.message}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>
                  {new Date(n.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
