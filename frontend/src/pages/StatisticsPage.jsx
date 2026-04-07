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
    </div>
  );
}
