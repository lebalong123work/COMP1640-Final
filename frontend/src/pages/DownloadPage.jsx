import { useState, useEffect } from 'react';
import Icon from '../components/Icon.jsx';
import { api } from '../services/api.js';

export default function DownloadPage() {
  const [closureDates, setClosureDates] = useState([]);

  useEffect(() => {
    api.get('/api/closure-dates').then(d => d.data && setClosureDates(d.data));
  }, []);

  const finalClosureDate = closureDates.filter(d => d.label === 'Final Closure Date').sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const isFinalClosed = finalClosureDate && new Date() > new Date(finalClosureDate.date);

  const handleDownload = async (url, filename) => {
    if (!isFinalClosed) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Download failed');
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      alert('Download failed: ' + e.message);
    }
  };

  const exportItems = [
    {
      title: 'Idea Export (CSV)',
      desc: 'All ideas with columns: ideaId, title, Author, Department, Class (category), Thump up, Thump down, View, Date, status.',
      icon: 'download',
      btn: 'Download idea_export.csv',
      url: '/api/export/csv-ideas',
      filename: 'idea_export.csv',
      rows: ['ideaId', 'title', 'Author', 'Department', 'Class (category)', 'Thump up', 'Thump down', 'View', 'Date', 'status'],
    },
    {
      title: 'Comment Export (CSV)',
      desc: 'All comments with columns: commentId, ideaId, content, language, createdwith.',
      icon: 'comment',
      btn: 'Download comment_export.csv',
      url: '/api/export/csv-comments',
      filename: 'comment_export.csv',
      rows: ['commentId', 'ideaId', 'content (text)', 'language (en)', 'createdwith (created date)'],
    },
    {
      title: 'Full Combined Export (CSV)',
      desc: 'Both idea_export and comment_export sections combined in one file.',
      icon: 'download',
      btn: 'Download combined CSV',
      url: '/api/export/csv',
      filename: `closure_date_export_${new Date().toISOString().split('T')[0]}.csv`,
      rows: ['idea_export section', 'comment_export section', 'All data combined'],
    },
    {
      title: 'Uploaded Documents (ZIP)',
      desc: 'All files uploaded by staff to support their ideas, packaged in a single ZIP archive.',
      icon: 'zip',
      btn: 'Download ZIP',
      url: '/api/export/zip',
      filename: 'uploads.zip',
      rows: ['All uploaded attachments', 'PDF documents', 'Excel spreadsheets', 'Image files', 'Other supporting documents'],
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Data Export</h1>
        <p className="page-sub">Download all data. Available to QA Manager only after final closure date.</p>
      </div>
      {!isFinalClosed && finalClosureDate && (
        <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
          <Icon name="alert" size={16} />
          <div>
            <strong>Downloads not yet available.</strong> Exports are unlocked after the Final Closure Date: <strong>{new Date(finalClosureDate.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>.
          </div>
        </div>
      )}
      {isFinalClosed && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <Icon name="check" size={16} />
          <div>
            <strong>Exports available.</strong> The Final Closure Date has passed. All data is ready to download.
          </div>
        </div>
      )}
      <div className="grid-2">
        {exportItems.map((item, i) => (
          <div key={i} className="card">
            <div className="card-header">
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon name={item.icon} size={16} /> {item.title}
              </span>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: '1rem', lineHeight: 1.6 }}>{item.desc}</p>
              <div style={{ background: 'var(--cream)', borderRadius: '6px', padding: '0.75rem', marginBottom: '1.25rem' }}>
                {item.rows.map((r, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', fontSize: '0.8rem', color: 'var(--text-2)', borderBottom: j < item.rows.length - 1 ? '1px dashed var(--border)' : 'none' }}>
                    <Icon name="check" size={12} /> {r}
                  </div>
                ))}
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', opacity: isFinalClosed ? 1 : 0.5 }}
                onClick={() => handleDownload(item.url, item.filename)}
                disabled={!isFinalClosed}
                title={!isFinalClosed ? 'Available after Final Closure Date' : ''}
              >
                <Icon name="download" size={15} /> {item.btn}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
