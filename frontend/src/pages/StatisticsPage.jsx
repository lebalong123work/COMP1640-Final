import { useState, useEffect } from 'react';
import Icon from '../components/Icon.jsx';
import { api } from '../services/api.js';
import {
  PieChart, Pie, Cell, Tooltip, Legend, Label,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList
} from 'recharts';

const PIE_COLORS = ['#0f1e36', '#c9a84c', '#1a7340', '#c0392b', '#1a4f8a', '#7b2d8b', '#243d63', '#e8c97a'];

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function StatisticsPage({ user }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/api/stats').then(d => d.data && setStats(d.data));
  }, []);

  if (!stats) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Statistical Analysis</h1>
          <p className="page-sub">Loading statistics…</p>
        </div>
      </div>
    );
  }

  const pieData = stats.byDept.filter(d => d.count > 0).map(d => ({ name: d.dept, value: d.count }));
  const catPieData = stats.byCategory.filter(d => d.count > 0).map(d => ({ name: d.cat, value: d.count }));
  const maxCat = Math.max(...(stats.byCategory.map(d => d.count)), 1);

  const deptBarData = stats.byDept.filter(d => d.count > 0).map(d => ({ name: d.dept, ideas: d.count }));
  const contributorsBarData = (stats.byDeptContributors || []).filter(d => d.contributors > 0).map(d => ({ name: d.dept, contributors: d.contributors }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Statistical Analysis</h1>
        <p className="page-sub">Insights into idea submission patterns and engagement across the University.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
        {[
          { label: 'Ideas Submitted', value: stats.totalIdeas, icon: 'idea', cls: 'si-gold' },
          { label: 'Total Comments', value: stats.totalComments, icon: 'comment', cls: 'si-navy' },
          { label: 'Contributors', value: stats.totalContributors ?? 0, icon: 'user', cls: 'si-green' },
          { label: 'Total Views', value: stats.totalViews, icon: 'eye', cls: 'si-red' },
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

      {/* Ideas by Category — CSS bar chart */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-header"><span className="card-title">Ideas by Category</span></div>
        <div className="card-body">
          <div className="bar-chart">
            {stats.byCategory.filter(d => d.count > 0).map((d, i) => (
              <div key={i} className="bar-row">
                <div className="bar-label">{d.cat}</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(d.count / maxCat) * 100}%`, background: 'linear-gradient(to right, var(--gold), var(--gold-light))' }} />
                </div>
                <div className="bar-count">{d.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recharts section */}
      <div style={{ marginBottom: '1.75rem' }}>
        {/* Category Split pie with labels */}
        <div className="card">
          <div className="card-header"><span className="card-title">Category Split</span></div>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
            {catPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={catPieData}
                    cx="50%"
                    cy="42%"
                    innerRadius={55}
                    outerRadius={90}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomLabel}
                  >
                    {catPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: '0.8rem', borderRadius: '8px' }}
                    formatter={(value, name) => [`${value} idea(s)`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.72rem', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>No category data</p></div>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '1.75rem' }}>
        {/* Ideas by Department bar chart */}
        <div className="card">
          <div className="card-header"><span className="card-title">Ideas by Department</span></div>
          <div className="card-body">
            {deptBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={deptBarData} margin={{ top: 20, right: 5, left: -20, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: '0.8rem', borderRadius: '8px' }} />
                  <Bar dataKey="ideas" fill="var(--gold)" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="ideas" position="top" style={{ fontSize: '10px', fill: 'var(--text-2)', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>No department data</p></div>
            )}
          </div>
        </div>

        {/* Ideas by Department pie with labels */}
        <div className="card">
          <div className="card-header"><span className="card-title">Department Share</span></div>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="42%"
                    outerRadius={90}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomLabel}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: '0.8rem', borderRadius: '8px' }}
                    formatter={(value, name) => [`${value} idea(s)`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.72rem', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>No department data</p></div>
            )}
          </div>
        </div>
      </div>

      {/* Contributors within Department */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-header"><span className="card-title">Contributors within Department</span></div>
        <div className="card-body">
          {contributorsBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={contributorsBarData} margin={{ top: 20, right: 5, left: -20, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: '0.8rem', borderRadius: '8px' }} />
                <Bar dataKey="contributors" fill="var(--green)" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="contributors" position="top" style={{ fontSize: '10px', fill: 'var(--text-2)', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>No contributor data</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
