import { useState, useEffect } from 'react';
import Icon from '../components/Icon.jsx';
import { api } from '../services/api.js';

const roleLabels = {
  staff: 'Staff',
  qa_coordinator: 'QA Coordinator',
  qa_manager: 'QA Manager',
  admin: 'Administrator'
};

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function AdminPage({ user }) {
  const [activeTab, setActiveTab] = useState('dates');
  const [academicYears, setAcademicYears] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddDept, setShowAddDept] = useState(false);
  const [showAddYear, setShowAddYear] = useState(false);
  const [editingDate, setEditingDate] = useState(null);
  const [editingYear, setEditingYear] = useState(null);
  const [addingDateForYear, setAddingDateForYear] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'staff', department: '' });
  const [newDept, setNewDept] = useState({ name: '' });
  const [newYearName, setNewYearName] = useState('');
  const [newClosureDate, setNewClosureDate] = useState({ label: 'Ideas Closure Date', date: '', status: 'open' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = () => {
    api.get('/api/academic-years').then(d => d.data && setAcademicYears(d.data));
    api.get('/api/users').then(d => d.data && setUsers(d.data));
    api.get('/api/departments').then(d => d.data && setDepartments(d.data));
  };

  const loadAuditLogs = () => {
    api.get('/api/admin/audit-logs').then(d => d.data && setAuditLogs(d.data));
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    const data = await api.delete(`/api/users/${id}`);
    if (data.error) setError(data.error);
    else { showSuccess('User deleted'); loadData(); }
  };

  const handleAddUser = async () => {
    const requiresDept = newUser.role !== 'admin';
    if (!newUser.name || !newUser.email || (requiresDept && !newUser.department)) {
      setError('All fields required');
      return;
    }
    const data = await api.post('/api/users', newUser);
    if (data.error) setError(data.error);
    else {
      setShowAddUser(false);
      setNewUser({ name: '', email: '', role: 'staff', department: '' });
      showSuccess('User added. Login credentials sent to their email.');
      loadData();
    }
  };

  const handleAddDept = async () => {
    if (!newDept.name) { setError('Department name required'); return; }
    const data = await api.post('/api/departments', newDept);
    if (data.error) setError(data.error);
    else {
      setShowAddDept(false);
      setNewDept({ name: '' });
      showSuccess('Department added');
      loadData();
    }
  };

  const handleDeleteDept = async (id) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    const data = await api.delete(`/api/departments/${id}`);
    if (data.error) setError(data.error);
    else { showSuccess('Department deleted'); loadData(); }
  };

  const handleUpdateDate = async (dateItem) => {
    const data = await api.put(`/api/closure-dates/${dateItem.id}`, dateItem);
    if (data.error) setError(data.error);
    else {
      setEditingDate(null);
      showSuccess('Closure date updated');
      loadData();
    }
  };

  const handleDeleteDate = async (id) => {
    if (!confirm('Delete this closure date?')) return;
    const data = await api.delete(`/api/closure-dates/${id}`);
    if (data.error) setError(data.error);
    else { showSuccess('Closure date deleted'); loadData(); }
  };

  const handleAddYear = async () => {
    if (!newYearName.trim()) { setError('Academic year name required'); return; }
    const data = await api.post('/api/academic-years', { name: newYearName.trim() });
    if (data.error) setError(data.error);
    else {
      setShowAddYear(false);
      setNewYearName('');
      showSuccess('Academic year added');
      loadData();
    }
  };

  const handleDeleteYear = async (id) => {
    if (!confirm('Delete this academic year and all its closure dates?')) return;
    const data = await api.delete(`/api/academic-years/${id}`);
    if (data.error) setError(data.error);
    else { showSuccess('Academic year deleted'); loadData(); }
  };

  const handleUpdateYear = async (year) => {
    const data = await api.put(`/api/academic-years/${year.id}`, { name: year.name });
    if (data.error) setError(data.error);
    else { setEditingYear(null); showSuccess('Academic year updated'); loadData(); }
  };

  const handleAddClosureDate = async (yearId) => {
    if (!newClosureDate.date) { setError('Date required'); return; }
    const data = await api.post(`/api/academic-years/${yearId}/closure-dates`, newClosureDate);
    if (data.error) setError(data.error);
    else {
      setAddingDateForYear(null);
      setNewClosureDate({ label: 'Ideas Closure Date', date: '', status: 'open' });
      showSuccess('Closure date added');
      loadData();
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">System Administration</h1>
        <p className="page-sub">Manage system configuration, closure dates, staff records and audit logs.</p>
      </div>

      {error && (
        <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
          <Icon name="alert" size={16} /><span>{error}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setError('')}>
            <Icon name="x" size={14} />
          </button>
        </div>
      )}
      {success && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          <Icon name="check" size={16} /><span>{success}</span>
        </div>
      )}

      <div className="tabs">
        {[
          ['dates', 'bell', 'Closure Dates'],
          ['users', 'user', 'Staff Records'],
          ['depts', 'grid', 'Departments'],
          ['audit', 'shield', 'Audit Logs'],
        ].map(([key, icon, label]) => (
          <div key={key} className={`tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
            <Icon name={icon} size={14} /> {label}
          </div>
        ))}
      </div>

      {/* ===== CLOSURE DATES with Academic Years ===== */}
      {activeTab === 'dates' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: 'var(--navy)' }}>Academic Years & Closure Dates</h2>
            <button className="btn btn-primary btn-sm" onClick={() => { setShowAddYear(true); setError(''); }}>
              <Icon name="plus" size={13} /> Add Academic Year
            </button>
          </div>

          {showAddYear && (
            <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.5rem' }}>
              <div className="form-label">New Academic Year Name</div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input className="form-input" placeholder="e.g. Academic Year 2026/27" value={newYearName} onChange={e => setNewYearName(e.target.value)} style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && handleAddYear()} autoFocus />
                <button className="btn btn-primary btn-sm" onClick={handleAddYear}>Add</button>
                <button className="btn btn-outline btn-sm" onClick={() => { setShowAddYear(false); setNewYearName(''); setError(''); }}>Cancel</button>
              </div>
            </div>
          )}

          {academicYears.length === 0 && (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>
              No academic years yet. Click "Add Academic Year" to create one.
            </div>
          )}

          {academicYears.map(year => (
            <div key={year.id} className="card" style={{ marginBottom: '1.25rem' }}>
              <div className="card-header" style={{ background: 'var(--cream)' }}>
                {editingYear && editingYear.id === year.id ? (
                  <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                    <input className="form-input" value={editingYear.name} onChange={e => setEditingYear({ ...editingYear, name: e.target.value })} style={{ flex: 1 }} />
                    <button className="btn btn-primary btn-sm" onClick={() => handleUpdateYear(editingYear)}>Save</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditingYear(null)}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <span className="card-title">{year.name}</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-icon" title="Edit" onClick={() => setEditingYear({ ...year })}><Icon name="settings" size={13} /></button>
                      <button className="btn-icon" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} title="Delete" onClick={() => handleDeleteYear(year.id)}><Icon name="trash" size={13} /></button>
                    </div>
                  </>
                )}
              </div>
              <div className="card-body">
                <div className="grid-2" style={{ marginBottom: '1rem' }}>
                  {(year.closureDates || []).map((c) => (
                    <div key={c.id} className="closure-item">
                      {editingDate && editingDate.id === c.id ? (
                        <div style={{ flex: 1 }}>
                          <input className="form-input" value={editingDate.label} onChange={e => setEditingDate({ ...editingDate, label: e.target.value })} style={{ marginBottom: '0.5rem' }} />
                          <input type="date" className="form-input" value={editingDate.date} onChange={e => setEditingDate({ ...editingDate, date: e.target.value })} style={{ marginBottom: '0.5rem' }} />
                          <select className="form-select" value={editingDate.status} onChange={e => setEditingDate({ ...editingDate, status: e.target.value })} style={{ marginBottom: '0.5rem' }}>
                            <option value="open">Open</option>
                            <option value="closed">Closed</option>
                          </select>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => handleUpdateDate(editingDate)}>Save</button>
                            <button className="btn btn-outline btn-sm" onClick={() => setEditingDate(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <div className="closure-label">{c.label}</div>
                            <div className="closure-date">{formatDate(c.date)}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className={`badge-${c.status}`}>{c.status}</span>
                            <button className="btn-icon" onClick={() => setEditingDate({ ...c })} title="Edit"><Icon name="settings" size={13} /></button>
                            <button className="btn-icon" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => handleDeleteDate(c.id)} title="Delete"><Icon name="trash" size={13} /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {addingDateForYear === year.id ? (
                  <div style={{ background: 'var(--cream)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--border)' }}>
                    <div className="grid-2" style={{ marginBottom: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Label</label>
                        <select className="form-select" value={newClosureDate.label} onChange={e => setNewClosureDate({ ...newClosureDate, label: e.target.value })}>
                          <option value="Ideas Closure Date">Ideas Closure Date</option>
                          <option value="Final Closure Date">Final Closure Date</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Date</label>
                        <input type="date" className="form-input" value={newClosureDate.date} onChange={e => setNewClosureDate({ ...newClosureDate, date: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Status</label>
                        <select className="form-select" value={newClosureDate.status} onChange={e => setNewClosureDate({ ...newClosureDate, status: e.target.value })}>
                          <option value="open">Open</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleAddClosureDate(year.id)}>Add Date</button>
                      <button className="btn btn-outline btn-sm" onClick={() => setAddingDateForYear(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-outline btn-sm" onClick={() => setAddingDateForYear(year.id)}>
                    <Icon name="plus" size={13} /> Add Closure Date
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== STAFF RECORDS ===== */}
      {activeTab === 'users' && (
        <div className="card">
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">Staff Records</span>
            <button className="btn btn-primary btn-sm" onClick={() => { setShowAddUser(true); setError(''); }}>
              <Icon name="plus" size={13} /> Add Staff
            </button>
          </div>

          {showAddUser && (
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
              <div className="grid-2" style={{ marginBottom: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="Dr. Jane Smith" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email (Gmail)</label>
                  <input className="form-input" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="j.smith@gmail.com" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Role</label>
                  <select className="form-select" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                    <option value="staff">Staff</option>
                    <option value="qa_coordinator">QA Coordinator</option>
                    <option value="qa_manager">QA Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {newUser.role !== 'admin' && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Department</label>
                    <select className="form-select" value={newUser.department} onChange={e => setNewUser({ ...newUser, department: e.target.value })}>
                      <option value="">Select department…</option>
                      {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="alert alert-info" style={{ marginTop: '0.75rem', marginBottom: '0.25rem', fontSize: '0.82rem' }}>
                <Icon name="alert" size={14} />
                <span>A random password will be auto-generated and emailed to the employee's Gmail address.</span>
              </div>
              {newUser.role === 'admin' && (
                <div className="alert alert-warning" style={{ marginBottom: '0.75rem', fontSize: '0.82rem' }}>
                  <Icon name="alert" size={14} />
                  <span>Only one Admin account is allowed. Admin accounts cannot be assigned to a department.</span>
                </div>
              )}
              {newUser.role === 'qa_manager' && (
                <div className="alert alert-warning" style={{ marginBottom: '0.75rem', fontSize: '0.82rem' }}>
                  <Icon name="alert" size={14} />
                  <span>Only one QA Manager account is allowed. Delete the existing QA Manager before creating a new one.</span>
                </div>
              )}
              {newUser.role === 'qa_coordinator' && (
                <div className="alert alert-info" style={{ marginBottom: '0.75rem', fontSize: '0.82rem' }}>
                  <Icon name="alert" size={14} />
                  <span>Note: Each department can only have one QA Coordinator.</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary btn-sm" onClick={handleAddUser}>Add User</button>
                <button className="btn btn-outline btn-sm" onClick={() => { setShowAddUser(false); setError(''); }}>Cancel</button>
              </div>
            </div>
          )}

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>
                      <span className={`badge-${u.role === 'admin' ? 'closed' : u.role === 'qa_manager' ? 'pending' : 'open'}`} style={{ textTransform: 'capitalize' }}>
                        {roleLabels[u.role] || u.role}
                      </span>
                    </td>
                    <td>{u.department}</td>
                    <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem' }}>{u.email}</td>
                    <td>
                      <button
                        className="btn-icon"
                        style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={u.id === user?.id}
                        title={u.id === user?.id ? 'Cannot delete yourself' : 'Delete user'}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== DEPARTMENTS ===== */}
      {activeTab === 'depts' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Departments & QA Coordinators</span>
            <button className="btn btn-primary btn-sm" onClick={() => { setShowAddDept(true); setError(''); }}>
              <Icon name="plus" size={13} /> Add Dept
            </button>
          </div>

          {showAddDept && (
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Department Name</label>
                <input className="form-input" value={newDept.name} onChange={e => setNewDept({ ...newDept, name: e.target.value })} placeholder="e.g. Computer Science" style={{ maxWidth: '360px' }} onKeyDown={e => e.key === 'Enter' && handleAddDept()} autoFocus />
              </div>
              <div className="alert alert-info" style={{ marginBottom: '0.75rem', fontSize: '0.82rem', maxWidth: '480px' }}>
                <Icon name="alert" size={14} />
                <span>To assign a QA Coordinator, create their account in Staff Records with the QA Coordinator role.</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary btn-sm" onClick={handleAddDept}>Add Department</button>
                <button className="btn btn-outline btn-sm" onClick={() => { setShowAddDept(false); setError(''); }}>Cancel</button>
              </div>
            </div>
          )}

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>QA Coordinator</th>
                  <th>Ideas</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.id}>
                    <td><strong>{d.name}</strong></td>
                    <td>{d.coordinator_name || '—'}</td>
                    <td><span className="badge-open">{d.ideas}</span></td>
                    <td><span className="badge-open">active</span></td>
                    <td>
                      <button
                        className="btn-icon"
                        style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
                        onClick={() => handleDeleteDept(d.id)}
                        title="Delete department"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== AUDIT LOGS ===== */}
      {activeTab === 'audit' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Audit Logs</span>
            <button className="btn btn-outline btn-sm" onClick={loadAuditLogs}>
              <Icon name="eye" size={13} /> Refresh
            </button>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', color: 'var(--text-3)' }}>{log.id}</td>
                    <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem' }}>{formatDateTime(log.created_at)}</td>
                    <td><strong>{log.user_name || '—'}</strong></td>
                    <td>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', background: 'var(--cream)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-2)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>No audit logs yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
