import { useState, useEffect } from 'react';
import Icon from '../components/Icon.jsx';
import { api } from '../services/api.js';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name, count }

  const loadCategories = () => {
    api.get('/api/categories').then(d => d.data && setCategories(d.data));
  };

  useEffect(() => { loadCategories(); }, []);

  const handleDelete = async (id) => {
    const cat = categories.find(c => c.id === id);
    if (cat && (cat.used || parseInt(cat.idea_count) > 0)) {
      setConfirmDelete({ id, name: cat.name, count: parseInt(cat.idea_count) });
      return;
    }
    try {
      const data = await api.delete(`/api/categories/${id}`);
      if (data.error) setError(data.error);
      else loadCategories();
    } catch (e) { setError('Delete failed'); }
  };

  const handleForceDelete = async () => {
    try {
      const data = await api.delete(`/api/categories/${confirmDelete.id}?force=true`);
      if (data.error) setError(data.error);
      else { setConfirmDelete(null); loadCategories(); }
    } catch (e) { setError('Delete failed'); }
  };

  const handleAdd = async () => {
    if (!newCat.trim()) return;
    try {
      const data = await api.post('/api/categories', { name: newCat.trim() });
      if (data.error) setError(data.error);
      else { setNewCat(''); setShowAdd(false); loadCategories(); }
    } catch (e) { setError('Add failed'); }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Manage Categories</h1>
          <p className="page-sub">Add new tags or remove categories. Force-delete will unlink the category from all ideas.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAdd(true); setError(''); }}>
          <Icon name="plus" size={15} /> Add Category
        </button>
      </div>

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div className="modal-title">Delete Category In Use</div>
              <button className="btn-icon" onClick={() => setConfirmDelete(null)}><Icon name="x" size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                <Icon name="alert" size={16} />
                <span>The category <strong>"{confirmDelete.name}"</strong> is currently used by <strong>{confirmDelete.count} idea(s)</strong>.</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                You can force-delete this category. It will be removed from all {confirmDelete.count} idea(s) that reference it, then permanently deleted.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleForceDelete}>
                <Icon name="trash" size={13} /> Force Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="alert alert-info" style={{ marginBottom: '1.25rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>New Category</div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                className="form-input"
                placeholder="Category name…"
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                style={{ flex: 1 }}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
              <button className="btn btn-primary" onClick={handleAdd}>Add</button>
              <button className="btn btn-outline" onClick={() => { setShowAdd(false); setNewCat(''); setError(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
          <Icon name="alert" size={16} /><span>{error}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setError('')}><Icon name="x" size={14} /></button>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">All Categories ({categories.length})</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{categories.filter(c => !c.used).length} can be deleted</span>
        </div>
        <div style={{ padding: '0.5rem 1.5rem' }}>
          {categories.map(cat => (
            <div key={cat.id} className="category-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Icon name="tag" size={15} />
                <span style={{ fontWeight: 500, color: 'var(--text)' }}>{cat.name}</span>
                {cat.used ? (
                  <span className="badge-open">In use ({cat.idea_count} ideas)</span>
                ) : (
                  <span className="badge-pending">Unused</span>
                )}
              </div>
              <button
                className={`btn btn-sm ${cat.used ? 'btn-outline' : 'btn-danger'}`}
                onClick={() => handleDelete(cat.id)}
                title={cat.used ? 'Category is in use — click to see details' : 'Delete category'}
              >
                <Icon name="trash" size={13} /> {cat.used ? 'In Use' : 'Delete'}
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="empty-state"><Icon name="tag" size={32} /><p>No categories yet.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
