import { useState, useRef } from 'react';
import Icon from './Icon.jsx';
import { getCategoryById } from '../utils/formatDate.js';
import { api } from '../services/api.js';

export default function SubmitIdeaModal({ categories, user, onClose, onSubmit }) {
  const [step, setStep] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedCats, setSelectedCats] = useState([]);
  const [anon, setAnon] = useState(false);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const toggleCat = (id) => setSelectedCats(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleFileChange = (e) => setFiles(Array.from(e.target.files));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('body', body);
      formData.append('anonymous', anon.toString());
      selectedCats.forEach(id => formData.append('categoryIds', id));
      files.forEach(f => formData.append('attachments', f));
      const data = await api.postForm('/api/ideas', formData);
      if (data.data) { onSubmit(); onClose(); }
      else if (data.error) setError(data.error);
    } catch (e) {
      setError('Submit failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gold)', marginBottom: '0.25rem' }}>Step {step} of 3</div>
            <div className="modal-title">
              {step === 1 ? 'Terms & Conditions' : step === 2 ? 'Your Idea' : 'Review & Submit'}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><Icon name="x" /></button>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <div>
              <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                <Icon name="shield" size={16} />
                <span>Please read and agree to our Terms & Conditions before submitting an idea.</span>
              </div>
              <div className="terms-box">
                <strong>University Ideas for Improvement — Terms & Conditions</strong><br /><br />
                1. <strong>Participation</strong> — All current staff of the University are eligible to submit ideas. By submitting an idea you confirm you are a current member of staff.<br /><br />
                2. <strong>Anonymous submissions</strong> — You may submit ideas and comments anonymously. However, your identity will be stored securely in the database. Anonymous status only affects public display. In cases of inappropriate content, stored identity information may be used for investigation purposes.<br /><br />
                3. <strong>Content standards</strong> — All ideas and comments must be respectful, constructive, and relevant to university improvement. Content that is offensive, discriminatory, defamatory, or otherwise inappropriate will be removed without notice.<br /><br />
                4. <strong>Data protection</strong> — Your submitted data will be processed in accordance with the University's Data Protection Policy and UK GDPR. Data may be retained for up to 3 years after the closure of the submissions period.<br /><br />
                5. <strong>Ownership</strong> — Ideas submitted become the intellectual property of the University for the purposes of quality assurance and improvement planning.<br /><br />
                6. <strong>Closure dates</strong> — New ideas may only be submitted until the Ideas Closure Date. Comments may continue to be posted until the Final Closure Date.
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--navy)' }} />
                I have read and agree to the Terms & Conditions
              </label>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="form-group">
                <label className="form-label">Idea Title *</label>
                <input className="form-input" placeholder="A concise, descriptive title…" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '140px' }}
                  placeholder="Describe your idea in detail. What is the problem? What is your proposed solution? What benefits would it bring?"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Categories</label>
                <div className="checkbox-group">
                  {categories.map(cat => (
                    <div key={cat.id} className={`checkbox-item ${selectedCats.includes(cat.id) ? 'selected' : ''}`} onClick={() => toggleCat(cat.id)}>
                      <Icon name="tag" size={12} /> {cat.name}
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Supporting Documents (Optional)</label>
                <div className="upload-zone" onClick={() => fileRef.current?.click()}>
                  <Icon name="upload" size={20} />
                  <div style={{ marginTop: '0.5rem' }}>
                    {files.length > 0 ? files.map(f => f.name).join(', ') : 'Drag & drop files here, or click to browse'}
                  </div>
                  <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>PDF, Word, Excel, images up to 10MB each</div>
                </div>
                <input type="file" ref={fileRef} multiple style={{ display: 'none' }} onChange={handleFileChange} />
              </div>
              <div className="anonymous-toggle" onClick={() => setAnon(!anon)}>
                <div className={`toggle ${anon ? 'on' : ''}`} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Submit anonymously</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '2px' }}>Your name won't be shown publicly, but is stored securely per our T&Cs</div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
                <Icon name="check" size={16} />
                <span>Ready to submit! Your QA Coordinator will be notified.</span>
              </div>
              {error && <div className="alert alert-warning" style={{ marginBottom: '1rem' }}><Icon name="alert" size={16} /><span>{error}</span></div>}
              <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '0.75rem' }}>{title || '(No title)'}</div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '1rem' }}>{body || '(No description)'}</p>
                {selectedCats.length > 0 && (
                  <div className="idea-tags">
                    {selectedCats.map(id => {
                      const c = getCategoryById(categories, id);
                      return c ? <span key={id} className="tag">{c.name}</span> : null;
                    })}
                  </div>
                )}
                {files.length > 0 && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-3)' }}>
                    Files: {files.map(f => f.name).join(', ')}
                  </div>
                )}
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-3)' }}>
                  Posting as: <strong>{anon ? 'Anonymous' : user.name}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step > 1 && <button className="btn btn-outline" onClick={() => setStep(s => s - 1)}>Back</button>}
          <button className="btn btn-ghost" onClick={onClose} style={{ background: 'var(--cream)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>Cancel</button>
          {step < 3
            ? <button
                className="btn btn-primary"
                disabled={(step === 1 && !agreed) || (step === 2 && (!title || !body))}
                onClick={() => setStep(s => s + 1)}
              >Continue</button>
            : <button className="btn btn-gold" onClick={handleSubmit} disabled={submitting}>
                <Icon name="check" size={15} /> {submitting ? 'Submitting…' : 'Submit Idea'}
              </button>
          }
        </div>
      </div>
    </div>
  );
}
