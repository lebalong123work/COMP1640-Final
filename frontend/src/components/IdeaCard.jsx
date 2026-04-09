import Icon from './Icon.jsx';
import { formatDate, getCategoryById } from '../utils/formatDate.js';

export default function IdeaCard({ idea, categories, onClick }) {
  const thumbsUp = idea.thumbsUp ?? 0;
  const thumbsDown = idea.thumbsDown ?? 0;
  const authorDisplay = idea.anonymous ? 'Anonymous' : (idea.author || 'Deleted User');

  return (
    <div className="idea-card" onClick={() => onClick(idea)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div className="idea-title">{idea.title}</div>
        <span className={`badge-${idea.status === 'open' ? 'open' : 'closed'}`} style={{ marginLeft: '0.75rem', flexShrink: 0 }}>{idea.status}</span>
      </div>
      <div className="idea-tags">
        {idea.categories.map(cid => {
          const cat = getCategoryById(categories, cid);
          return cat ? <span key={cid} className="tag">{cat.name}</span> : null;
        })}
      </div>
      <p className="idea-excerpt">{idea.body}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div className="idea-meta">
          <strong>{authorDisplay}</strong>
          <span>·</span>
          <span>{idea.department}</span>
          <span>·</span>
          <span>{formatDate(idea.date)}</span>
          {idea.attachments && idea.attachments.length > 0 && (
            <><span>·</span><span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Icon name="file" size={12} />{idea.attachments.length}</span></>
          )}
        </div>
        <div className="idea-stats">
          <span className="stat-item" style={{ color: 'var(--green)', fontWeight: 600 }}>
            <Icon name="thumb_up" size={13} /> {thumbsUp}
          </span>
          <span className="stat-item" style={{ color: 'var(--red)', fontWeight: 600 }}>
            <Icon name="thumb_down" size={13} /> {thumbsDown}
          </span>
          <span className="stat-item"><Icon name="eye" size={13} /> {idea.views}</span>
          <span className="stat-item"><Icon name="comment" size={13} /> {idea.comments}</span>
        </div>
      </div>
    </div>
  );
}
