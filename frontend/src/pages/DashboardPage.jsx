import { useState, useEffect } from 'react';
import Icon from '../components/Icon.jsx';
import { formatDate } from '../utils/formatDate.js';
import { api } from '../services/api.js';
import IdeaDetailModal from '../components/IdeaDetailModal.jsx';

const formatClosureDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

// Pick most recent closure date matching a label from an array
const latestDate = (arr, label) =>
  arr.filter(d => d.label === label).sort((a, b) => new Date(b.date) - new Date(a.date))[0];

// Staff Dashboard - no stat cards, just banner + 3 rank lists
function StaffDashboard({ user }) {
  const [topIdeas, setTopIdeas] = useState([]);
  const [mostViewed, setMostViewed] = useState([]);
  const [latestIdeas, setLatestIdeas] = useState([]);
  const [closureDates, setClosureDates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [academicYear, setAcademicYear] = useState('');
  const [selectedIdea, setSelectedIdea] = useState(null);

  useEffect(() => {
    api.get('/api/ideas?sort=popular&perPage=3').then(d => d.data && setTopIdeas(d.data));
    api.get('/api/ideas?sort=views&perPage=3').then(d => d.data && setMostViewed(d.data));
    api.get('/api/ideas?sort=latest&perPage=3').then(d => d.data && setLatestIdeas(d.data));
    api.get('/api/closure-dates').then(d => d.data && setClosureDates(d.data));
    api.get('/api/categories').then(d => d.data && setCategories(d.data));
    api.get('/api/academic-years').then(d => {
      if (d.data && d.data.length > 0) {
        setAcademicYear(d.data[0].name);
      }
    });
  }, []);

  const firstName = user.name.split(' ').slice(-1)[0] || user.name.split(' ')[0];
  const displayIdeas = latestDate(closureDates, 'Ideas Closure Date');
  const displayFinal = latestDate(closureDates, 'Final Closure Date');
  const displayDates = [displayIdeas, displayFinal].filter(Boolean);

  const handleTitleClick = (idea) => {
    api.get(`/api/ideas/${idea.id}`).then(d => d.data && setSelectedIdea(d.data));
  };

  return (
    <div>
      <div className="hero-banner">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>{academicYear || 'University Ideas Portal'}</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>{getGreeting()}, {firstName}</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Share your ideas to help improve our university.</p>
          {displayDates.length > 0 && (
            <div className="closure-bar" style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {displayDates.map((c, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.625rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>
                        {c.label === 'Ideas Closure Date' ? 'Idea Submission Closes' : 'Comment Period Closes'}
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.9rem', fontWeight: 600, color: 'var(--gold-light)' }}>{formatClosureDate(c.date)}</div>
                    </div>
                    <span className={`badge-${c.status}`}>{c.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <RankLists topIdeas={topIdeas} mostViewed={mostViewed} latestIdeas={latestIdeas} onTitleClick={handleTitleClick} />
      {selectedIdea && (
        <IdeaDetailModal
          idea={selectedIdea}
          categories={categories}
          user={user}
          closureDates={closureDates}
          onClose={() => setSelectedIdea(null)}
          onVoteUpdate={(ideaId, thumbsUp, thumbsDown, uv) => {
            const upd = (list) => list.map(i => i.id === ideaId ? { ...i, thumbsUp, thumbsDown, votes: thumbsUp - thumbsDown, hasVoted: uv } : i);
            setTopIdeas(upd); setMostViewed(upd); setLatestIdeas(upd);
            if (selectedIdea?.id === ideaId) setSelectedIdea(prev => prev ? { ...prev, thumbsUp, thumbsDown, votes: thumbsUp - thumbsDown, hasVoted: uv } : null);
          }}
          onIdeaUpdate={(updated) => {
            const upd = (list) => list.map(i => i.id === updated.id ? { ...i, ...updated } : i);
            setTopIdeas(upd); setMostViewed(upd); setLatestIdeas(upd);
          }}
          onIdeaDelete={(ideaId) => {
            const rm = (list) => list.filter(i => i.id !== ideaId);
            setTopIdeas(rm); setMostViewed(rm); setLatestIdeas(rm);
            setSelectedIdea(null);
          }}
        />
      )}
    </div>
  );
}

// QA Coordinator Dashboard - dept stats + ideas table
function CoordinatorDashboard({ user, setPage }) {
  const [ideas, setIdeas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [closureDates, setClosureDates] = useState([]);
  const [academicYear, setAcademicYear] = useState('');
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [deptStats, setDeptStats] = useState(null);

  useEffect(() => {
    api.get(`/api/ideas?department=${encodeURIComponent(user.department)}&perPage=100`).then(d => d.data && setIdeas(d.data));
    api.get('/api/closure-dates').then(d => d.data && setClosureDates(d.data));
    api.get('/api/categories').then(d => d.data && setCategories(d.data));
    api.get('/api/academic-years').then(d => {
      if (d.data && d.data.length > 0) setAcademicYear(d.data[0].name);
    });
    api.get(`/api/stats/department/${encodeURIComponent(user.department)}`).then(d => d.data && setDeptStats(d.data));
  }, [user.department]);

  const displayIdeas = latestDate(closureDates, 'Ideas Closure Date');
  const displayFinal = latestDate(closureDates, 'Final Closure Date');
  const displayDates = [displayIdeas, displayFinal].filter(Boolean);

  const filteredIdeas = ideas.filter(idea => {
    const matchSearch = !search || idea.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || idea.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this idea? This action cannot be undone.')) return;
    const data = await api.delete(`/api/ideas/${id}`);
    if (data.data) setIdeas(prev => prev.filter(i => i.id !== id));
  };

  const firstName = user.name.split(' ').slice(-1)[0] || user.name.split(' ')[0];

  return (
    <div>
      <div className="hero-banner">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>QA Coordinator — {user.department}</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>{getGreeting()}, {firstName}</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Monitor and moderate ideas from your department.</p>
          {displayDates.length > 0 && (
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {displayDates.map((c, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.625rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>
                      {c.label === 'Ideas Closure Date' ? 'Idea Submission Closes' : 'Comment Period Closes'}
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.9rem', fontWeight: 600, color: 'var(--gold-light)' }}>{formatClosureDate(c.date)}</div>
                  </div>
                  <span className={`badge-${c.status}`}>{c.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {deptStats && (
        <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
          {[
            { label: 'Ideas', value: deptStats.totalIdeas, icon: 'idea', cls: 'si-gold' },
            { label: 'Views', value: deptStats.totalViews, icon: 'eye', cls: 'si-navy' },
            { label: 'Votes', value: deptStats.totalVotes, icon: 'thumb_up', cls: 'si-green' },
            { label: 'Comments', value: deptStats.totalComments, icon: 'comment', cls: 'si-red' },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div className="stat-label">{s.label}</div>
                <div className={`stat-icon ${s.cls}`}><Icon name={s.icon} size={16} /></div>
              </div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Ideas from {user.department}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{filteredIdeas.length} ideas</span>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
            <span className="search-icon"><Icon name="eye" size={15} /></span>
            <input className="form-input" placeholder="Search ideas…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Title &amp; Category</th>
                <th>Submitted By</th>
                <th>Date</th>
                <th>Votes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIdeas.map(idea => (
                <tr key={idea.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedIdea(idea)}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '0.25rem' }}>{idea.title}</div>
                    <span className={`badge-${idea.status === 'open' ? 'open' : 'closed'}`}>{idea.status}</span>
                  </td>
                  <td>{idea.anonymous ? 'Anonymous' : idea.author}</td>
                  <td>{formatDate(idea.date)}</td>
                  <td>
                  <span style={{ display: 'flex', gap: '0.5rem', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--green)' }}>👍{idea.thumbsUp ?? 0}</span>
                    <span style={{ color: 'var(--red)' }}>👎{idea.thumbsDown ?? 0}</span>
                  </span>
                </td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); handleDelete(idea.id); }}>
                      <Icon name="trash" size={13} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filteredIdeas.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>No ideas found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedIdea && (
        <IdeaDetailModal
          idea={selectedIdea}
          categories={categories}
          user={user}
          closureDates={closureDates}
          onClose={() => setSelectedIdea(null)}
          onVoteUpdate={(ideaId, thumbsUp, thumbsDown, userVote) => setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, thumbsUp, thumbsDown, votes: thumbsUp - thumbsDown, hasVoted: userVote } : i))}
          onIdeaUpdate={(updated) => setIdeas(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i))}
          onIdeaDelete={(ideaId) => { setIdeas(prev => prev.filter(i => i.id !== ideaId)); setSelectedIdea(null); }}
        />
      )}
    </div>
  );
}

// QA Manager / Admin Dashboard - no stat cards, just banner + rank lists
function ManagerDashboard({ user }) {
  const [topIdeas, setTopIdeas] = useState([]);
  const [mostViewed, setMostViewed] = useState([]);
  const [latestIdeas, setLatestIdeas] = useState([]);
  const [closureDates, setClosureDates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [academicYear, setAcademicYear] = useState('');
  const [selectedIdea, setSelectedIdea] = useState(null);

  useEffect(() => {
    api.get('/api/ideas?sort=popular&perPage=3').then(d => d.data && setTopIdeas(d.data));
    api.get('/api/ideas?sort=views&perPage=3').then(d => d.data && setMostViewed(d.data));
    api.get('/api/ideas?sort=latest&perPage=3').then(d => d.data && setLatestIdeas(d.data));
    api.get('/api/closure-dates').then(d => d.data && setClosureDates(d.data));
    api.get('/api/categories').then(d => d.data && setCategories(d.data));
    api.get('/api/academic-years').then(d => {
      if (d.data && d.data.length > 0) setAcademicYear(d.data[0].name);
    });
  }, []);

  const firstName = user.name.split(' ').slice(-1)[0] || user.name.split(' ')[0];
  const displayIdeas = latestDate(closureDates, 'Ideas Closure Date');
  const displayFinal = latestDate(closureDates, 'Final Closure Date');
  const displayDates = [displayIdeas, displayFinal].filter(Boolean);

  const handleTitleClick = (idea) => {
    api.get(`/api/ideas/${idea.id}`).then(d => d.data && setSelectedIdea(d.data));
  };

  return (
    <div>
      <div className="hero-banner">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>{academicYear || 'University Ideas Portal'}</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>{getGreeting()}, {firstName}</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Here's an overview of the ideas portal activity this year.</p>
          {displayDates.length > 0 && (
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {displayDates.map((c, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.625rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>
                      {c.label === 'Ideas Closure Date' ? 'Idea Submission Closes' : 'Comment Period Closes'}
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.9rem', fontWeight: 600, color: 'var(--gold-light)' }}>{formatClosureDate(c.date)}</div>
                  </div>
                  <span className={`badge-${c.status}`}>{c.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <RankLists topIdeas={topIdeas} mostViewed={mostViewed} latestIdeas={latestIdeas} onTitleClick={handleTitleClick} />
      {selectedIdea && (
        <IdeaDetailModal
          idea={selectedIdea}
          categories={categories}
          user={user}
          closureDates={closureDates}
          onClose={() => setSelectedIdea(null)}
          onVoteUpdate={(ideaId, thumbsUp, thumbsDown, uv) => {
            const upd = (list) => list.map(i => i.id === ideaId ? { ...i, thumbsUp, thumbsDown, votes: thumbsUp - thumbsDown, hasVoted: uv } : i);
            setTopIdeas(upd); setMostViewed(upd); setLatestIdeas(upd);
            if (selectedIdea?.id === ideaId) setSelectedIdea(prev => prev ? { ...prev, thumbsUp, thumbsDown, votes: thumbsUp - thumbsDown, hasVoted: uv } : null);
          }}
          onIdeaUpdate={(updated) => {
            const upd = (list) => list.map(i => i.id === updated.id ? { ...i, ...updated } : i);
            setTopIdeas(upd); setMostViewed(upd); setLatestIdeas(upd);
          }}
          onIdeaDelete={(ideaId) => {
            const rm = (list) => list.filter(i => i.id !== ideaId);
            setTopIdeas(rm); setMostViewed(rm); setLatestIdeas(rm);
            setSelectedIdea(null);
          }}
        />
      )}
    </div>
  );
}

function RankLists({ topIdeas, mostViewed, latestIdeas, onTitleClick }) {
  const RankList = ({ title, items, scoreKey, icon }) => (
    <div className="card">
      <div className="card-header">
        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name={icon} size={16} />{title}
        </span>
      </div>
      <div style={{ padding: '0.75rem 1.25rem' }}>
        {items.map((idea, i) => (
          <div key={idea.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: '0.75rem 0', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width: '24px', height: '24px', background: i === 0 ? 'var(--gold)' : 'var(--cream)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: i === 0 ? 'var(--navy)' : 'var(--text-3)', flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                onClick={() => onTitleClick && onTitleClick(idea)}
                style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--navy)', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: onTitleClick ? 'pointer' : 'default', textDecoration: onTitleClick ? 'underline' : 'none', textDecorationColor: 'var(--gold)' }}
              >
                {idea.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{idea.department} · {formatDate(idea.date)}</div>
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '0.85rem' }}>
              {scoreKey === 'votes' ? (
                <span style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--green)' }}>👍{idea.thumbsUp ?? 0}</span>
                  <span style={{ color: 'var(--red)' }}>👎{idea.thumbsDown ?? 0}</span>
                </span>
              ) : (
                <span style={{ color: 'var(--navy)' }}>{idea[scoreKey]}</span>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="empty-state" style={{ padding: '1rem' }}><p>No ideas yet</p></div>}
      </div>
    </div>
  );

  return (
    <div className="grid-3">
      <RankList title="Most Popular" items={topIdeas} scoreKey="votes" icon="star" />
      <RankList title="Most Viewed" items={mostViewed} scoreKey="views" icon="eye" />
      <RankList title="Latest Ideas" items={latestIdeas} scoreKey="comments" icon="idea" />
    </div>
  );
}

export default function DashboardPage({ user, setPage }) {
  if (user.role === 'staff') return <StaffDashboard user={user} />;
  if (user.role === 'qa_coordinator') return <CoordinatorDashboard user={user} setPage={setPage} />;
  return <ManagerDashboard user={user} />;
}
