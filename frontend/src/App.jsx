import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import IdeasPage from './pages/IdeasPage.jsx';
import StatisticsPage from './pages/StatisticsPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import DownloadPage from './pages/DownloadPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import ExceptionReportsPage from './pages/ExceptionReportsPage.jsx';

export default function App() {
  const { user, logout, loading } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [authView, setAuthView] = useState('login');
  const [pendingIdeaId, setPendingIdeaId] = useState(null);

  // Reset to dashboard when user changes (account switch fix)
  useEffect(() => {
    if (user) {
      setPage('dashboard');
      setPendingIdeaId(null);
    }
  }, [user?.id]);

  const handleNavigateToIdea = (ideaId) => {
    setPage('ideas');
    setPendingIdeaId(ideaId);
  };

  const handleLogout = () => {
    setPage('dashboard');
    setPendingIdeaId(null);
    setAuthView('login');
    logout();
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy)' }}>
        <div style={{ color: 'white', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '1rem', opacity: 0.7 }}>Loading…</div>
      </div>
    );
  }

  if (!user) {
    if (authView === 'forgot') return <ForgotPasswordPage onBack={() => setAuthView('login')} />;
    return <LoginPage onForgotPassword={() => setAuthView('forgot')} />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage user={user} setPage={setPage} />;
      case 'ideas': return <IdeasPage user={user} pendingIdeaId={pendingIdeaId} onPendingIdeaHandled={() => setPendingIdeaId(null)} />;
      case 'statistics': return <StatisticsPage user={user} />;
      case 'exception-reports': return <ExceptionReportsPage user={user} />;
      case 'categories': return <CategoriesPage />;
      case 'download': return <DownloadPage />;
      case 'admin': return <AdminPage user={user} />;
      default: return <DashboardPage user={user} setPage={setPage} />;
    }
  };

  return (
    <Layout user={user} page={page} setPage={setPage} onLogout={handleLogout} onNavigateToIdea={handleNavigateToIdea}>
      {renderPage()}
    </Layout>
  );
}
