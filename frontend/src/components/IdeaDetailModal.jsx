import { useState, useEffect } from 'react';
import Icon from './Icon.jsx';
import { formatDate, getCategoryById } from '../utils/formatDate.js';
import { api } from '../services/api.js';

export default function IdeaDetailModal({ idea: initialIdea, categories, user, onClose, onVoteUpdate, onIdeaUpdate, onIdeaDelete, closureDates }) {
  const [idea, setIdea] = useState(initialIdea);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [anonComment, setAnonComment] = useState(false);
  const [voted, setVoted] = useState(initialIdea.hasVoted);
  const [thumbsUp, setThumbsUp] = useState(initialIdea.thumbsUp ?? 0);
  const [thumbsDown, setThumbsDown] = useState(initialIdea.thumbsDown ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentBody, setEditCommentBody] = useState('');
  const [editIdea, setEditIdea] = useState(false);
  const [editTitle, setEditTitle] = useState(initialIdea.title);
  const [editBody, setEditBody] = useState(initialIdea.body);
  const [editCats, setEditCats] = useState(initialIdea.categories || []);
  const [toast, setToast] = useState('');

  const ideasClosureDate = closureDates?.filter(d => d.label === 'Ideas Closure Date').sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const finalClosureDate = closureDates?.filter(d => d.label === 'Final Closure Date').sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const isIdeasClosed = ideasClosureDate && new Date() > new Date(ideasClosureDate.date);
  const isFinalClosed = finalClosureDate && new Date() > new Date(finalClosureDate.date);

  // Only staff can vote (QA Coordinator cannot per feedback-part-6)
  const canVote = user.role === 'staff';
  // Only staff can comment (QA Coordinator and QA Manager cannot per feedback parts 6 and 4)
  const canComment = user.role === 'staff' && !isFinalClosed;
  const isOwnIdea = idea.author_id === user.id;
  const canEdit = (user.role === 'staff' && isOwnIdea && !isIdeasClosed);
  const canDelete = (
    (user.role === 'staff' && isOwnIdea && !isIdeasClosed) ||
    (user.role === 'qa_coordinator' && (idea.department === user.department || idea.department_id === user.department_id)) ||
    user.role === 'admin'
  );

  useEffect(() => {
    loadComments();
  }, [idea.id]);

  const loadComments = () => {
    api.get(`/api/comments?ideaId=${idea.id}`)
      .then(d => d.data && setComments(d.data));
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleVote = async (value) => {
    if (!canVote) return;
    const numValue = value === 'up' ? 1 : -1;
    try {
      const data = await api.post('/api/votes', { ideaId: idea.id, value: numValue });
      if (data.data) {
        setThumbsUp(data.data.thumbsUp);
        setThumbsDown(data.data.thumbsDown);
        setVoted(data.data.userVote);
        if (onVoteUpdate) onVoteUpdate(idea.id, data.data.thumbsUp, data.data.thumbsDown, data.data.userVote);
      }
    } catch (e) { console.error('Vote error:', e); }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const data = await api.post('/api/comments', { ideaId: idea.id, body: newComment, anonymous: anonComment });
      if (data.data) {
        setComments(prev => [...prev, data.data]);
        setNewComment('');
        setAnonComment(false);
      }
    } catch (e) { console.error('Comment error:', e); } finally { setSubmitting(false); }
  };

  const handleDeleteComment = async (cid) => {
    if (!confirm('Delete this comment?')) return;
    const data = await api.delete(`/api/comments/${cid}`);
    if (data.data) setComments(prev => prev.filter(c => c.id !== cid));
  };

  const handleStartEditComment = (c) => {
    setEditingComment(c.id);
    setEditCommentBody(c.body);
  };

  const handleSaveEditComment = async (cid) => {
    const data = await api.put(`/api/comments/${cid}`, { body: editCommentBody });
    if (data.data) {
      setComments(prev => prev.map(c => c.id === cid ? { ...c, body: editCommentBody } : c));
      setEditingComment(null);
    }
  };

  const handleSaveEditIdea = async () => {
    const data = await api.put(`/api/ideas/${idea.id}`, { title: editTitle, body: editBody, categoryIds: editCats });
    if (data.data) {
      const updatedIdea = { ...idea, title: editTitle, body: editBody, categories: editCats };
      setIdea(updatedIdea);
      setEditIdea(false);
      if (onIdeaUpdate) onIdeaUpdate(updatedIdea);
      showToast('Idea updated successfully');
    } else if (data.error) {
      showToast(data.error);
    }
  };

  const handleDeleteIdea = async () => {
    if (!confirm('Are you sure you want to delete this idea? This action cannot be undone.')) return;
    const data = await api.delete(`/api/ideas/${idea.id}`);
    if (data.data) {
      if (onIdeaDelete) onIdeaDelete(idea.id);
      onClose();
    } else if (data.error) {
      showToast(data.error);
    }
  };

  const toggleEditCat = (id) => {
    const numId = parseInt(id);
    setEditCats(prev => prev.includes(numId) ? prev.filter(x => x !== numId) : [...prev, numId]);
  };

  const authorDisplay = idea.anonymous ? 'Anonymous' : (idea.author || 'Deleted User');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        {toast && (
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--green)', color: 'white', padding: '0.75rem 1.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
            {toast}
          </div>
        )}

        <div className="modal-header">
          <div style={{ flex: 1 }}>
            {!editIdea ? (
              <>
                <div className="idea-tags" style={{ marginBottom: '0.5rem' }}>
                  {idea.categories.map(cid => {
                    const cat = getCategoryById(categories, cid);
                    return cat ? <span key={cid} className="tag">{cat.name}</span> : null;
                  })}
                </div>
                <div className="modal-title">{idea.title}</div>
                <div className="idea-meta" style={{ marginTop: '0.4rem' }}>
                  <strong>{authorDisplay}</strong>
                  <span>·</span><span>{idea.department}</span>
                  <span>·</span><span>{formatDate(idea.date)}</span>
                  <span>·</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Icon name="eye" size={12} /> {idea.views}
                  </span>
                </div>
              </>
            ) : (
              <div>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Title</label>
                  <input className="form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" style={{ minHeight: '100px' }} value={editBody} onChange={e => setEditBody(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Categories</label>
                  <div className="checkbox-group">
                    {categories.map(cat => (
                      <div key={cat.id} className={`checkbox-item ${editCats.includes(cat.id) ? 'selected' : ''}`} onClick={() => toggleEditCat(cat.id)}>
                        <Icon name="tag" size={12} /> {cat.name}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveEditIdea}>Save Changes</button>
                  <button className="btn btn-outline btn-sm" onClick={() => { setEditIdea(false); setEditTitle(idea.title); setEditBody(idea.body); setEditCats(idea.categories || []); }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginLeft: '1rem' }}>
            {!editIdea && canEdit && (
              <button className="btn-icon" title="Edit idea" onClick={() => setEditIdea(true)}>
                <Icon name="settings" size={14} />
              </button>
            )}
            {canDelete && (
              <button className="btn-icon" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} title="Delete idea" onClick={handleDeleteIdea}>
                <Icon name="trash" size={14} />
              </button>
            )}
            <button className="btn-icon" onClick={onClose}><Icon name="x" size={16} /></button>
          </div>
        </div>

        {!editIdea && (
          <div className="idea-detail-body">
            <p>{idea.body}</p>
            {idea.attachments && idea.attachments.length > 0 && (
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: '0.5rem' }}>Attachments</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {idea.attachments.map((a, i) => (
                    <a key={i} href={`/${a.filepath}`} target="_blank" rel="noreferrer" className="attachment-chip">
                      <Icon name="file" size={13} />{a.filename}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {canVote && !editIdea && (
          <div style={{ padding: '0 1.75rem', paddingBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--cream)', borderRadius: '8px', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)' }}>Cast your vote:</span>
              <button className={`vote-btn up ${voted === 'up' ? 'active' : ''}`} onClick={() => handleVote('up')}>
                <Icon name="thumb_up" size={14} /> Thumbs Up
              </button>
              <button className={`vote-btn down ${voted === 'down' ? 'active' : ''}`} onClick={() => handleVote('down')}>
                <Icon name="thumb_down" size={14} /> Thumbs Down
              </button>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Icon name="thumb_up" size={14} /> {thumbsUp}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Icon name="thumb_down" size={14} /> {thumbsDown}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Show vote counts for non-voting roles (read-only) */}
        {!canVote && !editIdea && (
          <div style={{ padding: '0 1.75rem', paddingBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', padding: '0.75rem 1rem', background: 'var(--cream)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Icon name="thumb_up" size={14} /> {thumbsUp}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Icon name="thumb_down" size={14} /> {thumbsDown}
              </span>
            </div>
          </div>
        )}

        {!editIdea && (
          <div style={{ padding: '0 1.75rem 1.75rem' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: '1rem', color: 'var(--navy)', marginBottom: '1rem' }}>
              Comments ({comments.length})
            </div>
            {comments.map(c => (
              <div key={c.id} className="comment">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="comment-author">{c.anonymous ? 'Anonymous' : (c.author || 'Deleted User')}</span>
                    <span className="comment-date">{formatDate(c.date)}</span>
                  </div>
                  {user.role === 'staff' && c.author_id === user.id && (
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn-icon" style={{ padding: '0.25rem' }} onClick={() => handleStartEditComment(c)} title="Edit comment">
                        <Icon name="settings" size={12} />
                      </button>
                      <button className="btn-icon" style={{ padding: '0.25rem', color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => handleDeleteComment(c.id)} title="Delete comment">
                        <Icon name="trash" size={12} />
                      </button>
                    </div>
                  )}
                </div>
                {editingComment === c.id ? (
                  <div style={{ marginTop: '0.5rem' }}>
                    <textarea className="form-textarea" style={{ minHeight: '60px', marginBottom: '0.5rem' }} value={editCommentBody} onChange={e => setEditCommentBody(e.target.value)} />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleSaveEditComment(c.id)}>Save</button>
                      <button className="btn btn-outline btn-sm" onClick={() => setEditingComment(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="comment-body">{c.body}</p>
                )}
              </div>
            ))}
            {comments.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--text-3)', marginBottom: '1rem' }}>No comments yet.</p>}

            {isFinalClosed && (
              <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
                <Icon name="alert" size={16} />
                <span>The Final Closure Date has passed. Commenting is no longer available.</span>
              </div>
            )}

            {canComment && (
              <div style={{ marginTop: '1rem' }}>
                <div className="form-label">Add a Comment</div>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '80px', marginBottom: '0.75rem' }}
                  placeholder="Share your thoughts…"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="anonymous-toggle" onClick={() => setAnonComment(!anonComment)} style={{ cursor: 'pointer' }}>
                    <div className={`toggle ${anonComment ? 'on' : ''}`} />
                    <span style={{ fontSize: '0.82rem' }}>Post anonymously</span>
                  </div>
                  <button className="btn btn-primary btn-sm" disabled={!newComment.trim() || submitting} onClick={handlePostComment}>
                    Post Comment
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
