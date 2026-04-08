import { useState, useEffect } from 'react';
import Icon from '../components/Icon.jsx';
import { api } from '../services/api.js';
import IdeaDetailModal from '../components/IdeaDetailModal.jsx';

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

function IdeasWithoutComments({ onViewIdea }) {
  const [ideas, setIdeas] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [page, setPage] = useState(0);
  const PER_PAGE = 5;

  useEffect(() => {
    api.get('/api/stats/ideas-without-comments').then(d => d.data && setIdeas(d.data));
  }, []);

  const filtered = ideas
    .filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'views') return b.views - a.views;
      if (sortBy === 'likes') return b.votes - a.votes;
      return 0;
    });

  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}><Icon name="eye" size={15} /></span>
          <input className="form-input" placeholder="Search by title…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} style={{ paddingLeft: '2.25rem' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', alignSelf: 'center' }}>Sort:</span>
          {['date', 'views', 'likes'].map(s => (
            <button key={s} className={`btn btn-sm ${sortBy === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSortBy(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: '0.75rem' }}>
        Showing {paginated.length > 0 ? page * PER_PAGE + 1 : 0}–{Math.min((page + 1) * PER_PAGE, filtered.length)} of {filtered.length} results
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Idea Title</th>
              <th>Department</th>
              <th>Author</th>
              <th>Created Date</th>
              <th>Views</th>
              <th>Likes Score</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(idea => (
              <tr key={idea.id}>
                <td style={{ fontWeight: 600, color: 'var(--navy)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span onClick={() => onViewIdea(idea)} style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--gold)' }}>{idea.title}</span>
                </td>
                <td><span className="tag">{idea.department}</span></td>
                <td>{idea.author}</td>
                <td>{formatDate(idea.date)}</td>
                <td><span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Icon name="eye" size={13} />{idea.views}</span></td>
                <td>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: idea.votes > 0 ? 'var(--green)' : idea.votes < 0 ? 'var(--red)' : 'var(--text-3)' }}>
                    {idea.votes > 0 ? '+' : ''}{idea.votes}
                  </span>
                </td>
                <td><span className={`badge-${idea.status === 'open' ? 'open' : 'closed'}`}>{idea.status}</span></td>
                <td>
                  <button className="btn btn-sm btn-outline" onClick={() => onViewIdea(idea)}>
                    <Icon name="eye" size={12} /> View
                  </button>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>No ideas found without comments</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} className={`page-btn ${page === i ? 'active' : ''}`} onClick={() => setPage(i)}>{i + 1}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function AnonymousContent({ onViewIdea }) {
  const [data, setData] = useState({ ideas: [], comments: [] });
  const [subTab, setSubTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PER_PAGE = 5;

  useEffect(() => {
    api.get('/api/stats/anonymous-content').then(d => d.data && setData(d.data));
  }, []);

  const allItems = [
    ...(subTab !== 'comments' ? data.ideas : []),
    ...(subTab !== 'ideas' ? data.comments : []),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const filtered = allItems.filter(i => !search || (i.content || '').toLowerCase().includes(search.toLowerCase()) || (i.related_idea || '').toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {[['all', 'All'], ['ideas', 'Ideas Only'], ['comments', 'Comments Only']].map(([key, label]) => (
          <button key={key} className={`btn btn-sm ${subTab === key ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setSubTab(key); setPage(0); }}>{label}</button>
        ))}
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}><Icon name="eye" size={15} /></span>
          <input className="form-input" placeholder="Search by keywords…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} style={{ paddingLeft: '2.25rem' }} />
        </div>
      </div>

      <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: '0.75rem' }}>
        Showing {paginated.length > 0 ? page * PER_PAGE + 1 : 0}–{Math.min((page + 1) * PER_PAGE, filtered.length)} of {filtered.length} items
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Content Preview</th>
              <th>Related Idea</th>
              <th>Department</th>
              <th>Identity</th>
              <th>Created Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, idx) => (
              <tr key={`${item.type}-${item.id}-${idx}`}>
                <td>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', background: item.type === 'idea' ? '#e8edf5' : '#fff3e8', color: item.type === 'idea' ? 'var(--navy)' : '#d97706' }}>
                    {item.type === 'idea' ? 'IDEA' : 'COMMENT'}
                  </span>
                </td>
                <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-2)' }}>
                  {(item.content || '').slice(0, 60)}{(item.content || '').length > 60 ? '…' : ''}
                </td>
                <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                  <span onClick={() => onViewIdea({ id: item.idea_id })} style={{ cursor: 'pointer', color: 'var(--navy)', textDecoration: 'underline', textDecorationColor: 'var(--gold)' }}>
                    {item.related_idea}
                  </span>
                </td>
                <td><span className="tag">{item.department}</span></td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: 'var(--text-3)' }}>
                    <Icon name="lock" size={13} /> Anonymous
                  </span>
                </td>
                <td style={{ fontSize: '0.82rem' }}>{formatDate(item.date)}</td>
                <td>
                  <button className="btn btn-sm btn-outline" onClick={() => onViewIdea({ id: item.idea_id })}>
                    <Icon name="eye" size={12} /> View
                  </button>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>No anonymous content found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} className={`page-btn ${page === i ? 'active' : ''}`} onClick={() => setPage(i)}>{i + 1}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExceptionReportsPage({ user }) {
  const [activeTab, setActiveTab] = useState('no-comments');
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [categories, setCategories] = useState([]);
  const [closureDates, setClosureDates] = useState([]);

  useEffect(() => {
    api.get('/api/categories').then(d => d.data && setCategories(d.data));
    api.get('/api/closure-dates').then(d => d.data && setClosureDates(d.data));
  }, []);

  const handleViewIdea = (ideaRef) => {
    api.get(`/api/ideas/${ideaRef.id}`).then(d => d.data && setSelectedIdea(d.data));
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Exception Reports</h1>
        <p className="page-sub">Identify ideas without engagement and review anonymous content.</p>
      </div>

      <div className="tabs">
        <div className={`tab ${activeTab === 'no-comments' ? 'active' : ''}`} onClick={() => setActiveTab('no-comments')}>
          <Icon name="comment" size={14} /> Ideas Without Comments
        </div>
        <div className={`tab ${activeTab === 'anonymous' ? 'active' : ''}`} onClick={() => setActiveTab('anonymous')}>
          <Icon name="lock" size={14} /> Anonymous Content
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {activeTab === 'no-comments' && <IdeasWithoutComments onViewIdea={handleViewIdea} />}
          {activeTab === 'anonymous' && <AnonymousContent onViewIdea={handleViewIdea} />}
        </div>
      </div>

      {selectedIdea && (
        <IdeaDetailModal
          idea={selectedIdea}
          categories={categories}
          user={user}
          closureDates={closureDates}
          onClose={() => setSelectedIdea(null)}
          onVoteUpdate={() => {}}
          onIdeaUpdate={() => {}}
          onIdeaDelete={() => setSelectedIdea(null)}
        />
      )}
    </div>
  );
}
