import { useState } from 'react';
import Icon from '../components/Icon.jsx';

export default function ForgotPasswordPage({ onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setSuccess(true);
    } catch (e) {
      setError('Request failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">U</div>
          <div className="login-title">Reset Password</div>
          <div className="login-sub">University Quality Assurance Portal</div>
        </div>
        <div className="login-body">
          {success ? (
            <div>
              <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
                <Icon name="check" size={16} />
                <span>A new password has been sent to your email.</span>
              </div>
              <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={onBack}>
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                Enter your university email address and we'll generate a new password and send it to you.
              </p>
              <div className="form-group">
                <label className="form-label">University Email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
              {error && (
                <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                  <Icon name="alert" size={16} /><span>{error}</span>
                </div>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginBottom: '0.75rem' }}
                disabled={loading}
              >
                {loading ? 'Sending…' : 'Send New Password'}
              </button>
              <button type="button" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={onBack}>
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
