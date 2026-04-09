import { useState, useEffect } from 'react';
import Icon from '../components/Icon.jsx';
import IdeaCard from '../components/IdeaCard.jsx';
import Pagination from '../components/Pagination.jsx';
import IdeaDetailModal from '../components/IdeaDetailModal.jsx';
import SubmitIdeaModal from '../components/SubmitIdeaModal.jsx';
import { api } from '../services/api.js';

export default function IdeasPage({ user, pendingIdeaId, onPendingIdeaHandled }) {
  const [ideas, setIdeas] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [closureDates, setClosureDates] = useState([]);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState('latest');
  const [filterCat, setFilterCat] = useState('all');
  const [filterDept, setFilterDept] = useState(user.role === 'qa_coordinator' ? user.department : 'all');
  const [search, setSearch] = useState('');
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const PER_PAGE = 5;

  const canSubmit = user.role === 'staff';
  const ideasClosureDate = closureDates.filter(d => d.label === 'Ideas Closure Date').sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const isIdeasClosed = ideasClosureDate && new Date() > new Date(ideasClosureDate.date);

  const loadIdeas = () => {
    const params = new URLSearchParams({
      sort,
      page,
      perPage: PER_PAGE,
      ...(filterCat !== 'all' && { category: filterCat }),
      ...(filterDept !== 'all' && { department: filterDept }),
      ...(search && { search })
    });
    api.get(`/api/ideas?${params}`)
      .then(d => {
        if (d.data) { setIdeas(d.data); setTotal(d.total); }
      });
  };

  useEffect(() => {
    api.get('/api/categories').then(d => d.data && setCategories(d.data));
    api.get('/api/departments').then(d => d.data && setDepartments(d.data));
    api.get('/api/closure-dates').then(d => d.data && setClosureDates(d.data));
  }, []);

  useEffect(() => {
    loadIdeas();
  }, [sort, filterCat, filterDept, search, page]);

  useEffect(() => {
    if (pendingIdeaId) {
      api.get(`/api/ideas/${pendingIdeaId}`).then(d => {
        if (d.data) setSelectedIdea(d.data);
        onPendingIdeaHandled?.();
      });
    }
  }, [pendingIdeaId]);

  const handleSearchChange = (val) => { setSearch(val); setPage(0); };
  const handleCatChange = (val) => { setFilterCat(val); setPage(0); };
  const handleDeptChange = (val) => { setFilterDept(val); setPage(0); };

  const handleVoteUpdate = (ideaId, newThumbsUp, newThumbsDown, newUserVote) => {
    setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, thumbsUp: newThumbsUp, thumbsDown: newThumbsDown, votes: newThumbsUp - newThumbsDown, hasVoted: newUserVote } : i));
  };

  const handleIdeaUpdate = (updatedIdea) => {
    setIdeas(prev => prev.map(i => i.id === updatedIdea.id ? { ...i, ...updatedIdea } : i));
    setSelectedIdea(prev => prev ? { ...prev, ...updatedIdea } : null);
  };

  const handleIdeaDelete = (ideaId) => {
    setIdeas(prev => prev.filter(i => i.id !== ideaId));
    setTotal(prev => prev - 1);
    setSelectedIdea(null);
  };

  return (
    <div>
      <div className="hero-banner">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>Quality Assurance · Ideas Portal</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {canSubmit ? 'Share Your Ideas' : 'Browse Ideas'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', maxWidth: '480px', lineHeight: 1.6 }}>
            {canSubmit
              ? 'Help shape the future of our university. Submit your ideas for improvement and see what your colleagues are proposing.'
              : 'Browse and review ideas submitted by university staff.'}
          </p>
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {canSubmit && !isIdeasClosed && (
              <button className="btn btn-gold" onClick={() => setShowSubmit(true)}><Icon name="plus" size={15} /> Submit an Idea</button>
            )}
            {canSubmit && isIdeasClosed && (
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', padding: '0.5rem 1rem', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px' }}>
                Ideas submission closed
              </span>
            )}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
              <span><strong style={{ color: 'var(--gold-light)' }}>{total}</strong> ideas submitted</span>
            </div>
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
          <span className="search-icon"><Icon name="eye" size={15} /></span>
          <input
            className="form-input"
            placeholder="Search ideas…"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={sort} onChange={e => setSort(e.target.value)}>
          <option value="latest">Latest Ideas</option>
          <option value="popular">Most Popular</option>
          <option value="views">Most Viewed</option>
          <option value="comments">Most Commented</option>
        </select>
        <select className="form-select" style={{ width: 'auto' }} value={filterCat} onChange={e => handleCatChange(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {['qa_manager', 'admin'].includes(user.role) && (
          <select className="form-select" style={{ width: 'auto' }} value={filterDept} onChange={e => handleDeptChange(e.target.value)}>
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        )}
        {user.role === 'qa_coordinator' && (
          <span style={{ fontSize: '0.82rem', color: 'var(--text-3)', padding: '0.4rem 0.75rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--cream)' }}>
            {user.department}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {ideas.length === 0 ? (
          <div className="empty-state"><Icon name="idea" size={32} /><p>No ideas found matching your criteria.</p></div>
        ) : ideas.map(idea => (
          <IdeaCard key={idea.id} idea={idea} categories={categories} onClick={setSelectedIdea} />
        ))}
      </div>
      <Pagination total={total} perPage={PER_PAGE} page={page} setPage={setPage} />

      {selectedIdea && (
        <IdeaDetailModal
          idea={selectedIdea}
          categories={categories}
          user={user}
          onClose={() => setSelectedIdea(null)}
          onVoteUpdate={handleVoteUpdate}
          onIdeaUpdate={handleIdeaUpdate}
          onIdeaDelete={handleIdeaDelete}
          closureDates={closureDates}
        />
      )}
      {showSubmit && canSubmit && !isIdeasClosed && (
        <SubmitIdeaModal
          categories={categories}
          user={user}
          onClose={() => setShowSubmit(false)}
          onSubmit={loadIdeas}
        />
      )}
    </div>
  );
}
