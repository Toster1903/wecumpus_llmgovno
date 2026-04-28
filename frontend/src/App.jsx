import { useEffect, useState } from 'react';
import ProfileBuilder from './pages/ProfileBuilder';
import ProfileSetup from './pages/ProfileSetup';
import Login from './pages/Login';
import VerifyEmailPage from './pages/VerifyEmailPage';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Rides from './pages/Rides';
import Plan from './pages/Plan';
import Marketplace from './pages/Marketplace';
import MatchesPage from './pages/MatchesPage';
import InboxPage from './pages/InboxPage';
import Posts from './pages/Posts';
import UserProfilePage from './pages/UserProfilePage';
import ChatBot from './components/ChatBot';
import api from './api/axios';
import { clearAuthToken, getAuthToken, setAuthToken } from './utils/authToken';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Home' },
  { id: 'matches',   label: 'Match' },
  { id: 'inbox',     label: 'Inbox' },
  { id: 'posts',     label: 'Лента' },
  { id: 'profile',   label: 'Profile' },
];

const APP_TO_PAGE = {
  matches: 'matches',
  chat:    'inbox',
  clubs:   'inbox',
  profile: 'profile',
  events:  'events',
  rides:   'rides',
  plan:    'plan',
  market:  'market',
  posts:   'posts',
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAuthToken()));
  const [isCheckingProfile, setIsCheckingProfile] = useState(Boolean(getAuthToken()));
  const [hasProfile, setHasProfile] = useState(false);
  const [me, setMe] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedUserProfileId, setSelectedUserProfileId] = useState(null);
  const [pendingChatUserId, setPendingChatUserId] = useState(null);

  if (window.location.pathname === '/verify-email') {
    return <VerifyEmailPage onGoToLogin={() => window.location.replace('/')} />;
  }

  useEffect(() => {
    const checkProfile = async () => {
      if (!isAuthenticated) {
        setIsCheckingProfile(false);
        setHasProfile(false);
        setMe(null);
        return;
      }
      setIsCheckingProfile(true);
      try {
        const r = await api.get('/profiles/me');
        setHasProfile(true);
        setMe(r.data);
      } catch (error) {
        if (error?.response?.status === 404) {
          setHasProfile(false);
        } else if (error?.response?.status === 401) {
          clearAuthToken();
          setIsAuthenticated(false);
          setHasProfile(false);
        }
      } finally {
        setIsCheckingProfile(false);
      }
    };
    checkProfile();
  }, [isAuthenticated]);

  const handleLoginSuccess = (token) => {
    setAuthToken(token);
    setIsAuthenticated(true);
    setSelectedUserProfileId(null);
    setPendingChatUserId(null);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    clearAuthToken();
    setIsAuthenticated(false);
    setHasProfile(false);
    setMe(null);
    setSelectedUserProfileId(null);
    setPendingChatUserId(null);
    setCurrentPage('dashboard');
  };

  const handleOpenUserProfile = (userId) => {
    setSelectedUserProfileId(userId);
    setCurrentPage('userProfile');
  };

  const handleStartChatFromProfile = (userId) => {
    setPendingChatUserId(userId);
    setCurrentPage('inbox');
  };

  const handleAppNavigate = (appId) => {
    const page = APP_TO_PAGE[appId] || 'dashboard';
    setCurrentPage(page);
  };

  if (!isAuthenticated) return <Login onLoginSuccess={handleLoginSuccess} />;

  if (isCheckingProfile) {
    return (
      <div className="page-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card-cream" style={{ padding: '1.5rem 2rem' }}>
          <span className="spin" /> Проверяем профиль...
        </div>
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <ProfileSetup
        onProfileCreated={() => { setHasProfile(true); setCurrentPage('dashboard'); }}
        onLogout={handleLogout}
      />
    );
  }

  const initials = (me?.full_name || '·')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  if (currentPage === 'profile') {
    return (
      <div>
        <Nav currentPage={currentPage} setCurrentPage={setCurrentPage} onLogout={handleLogout} initials={initials} />
        <ProfileBuilder onUnauthorized={handleLogout} />
      </div>
    );
  }

  if (currentPage === 'userProfile') {
    return (
      <div>
        <Nav currentPage={currentPage} setCurrentPage={setCurrentPage} onLogout={handleLogout} initials={initials} />
        <UserProfilePage
          userId={selectedUserProfileId}
          onBack={() => setCurrentPage('matches')}
          onUnauthorized={handleLogout}
          onWrite={handleStartChatFromProfile}
        />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Nav currentPage={currentPage} setCurrentPage={setCurrentPage} onLogout={handleLogout} initials={initials} />
      <div className="page-content">
        {currentPage === 'dashboard' && (
          <Dashboard
            onUnauthorized={handleLogout}
            onNavigate={handleAppNavigate}
            onOpenUserProfile={handleOpenUserProfile}
            onSayHi={handleStartChatFromProfile}
          />
        )}
        {currentPage === 'matches' && (
          <MatchesPage
            onUnauthorized={handleLogout}
            onOpenUserProfile={handleOpenUserProfile}
          />
        )}
        {currentPage === 'inbox' && (
          <InboxPage
            onUnauthorized={handleLogout}
            onOpenUserProfile={handleOpenUserProfile}
            initialChatUserId={pendingChatUserId}
            onInitialChatHandled={() => setPendingChatUserId(null)}
          />
        )}
        {currentPage === 'posts'  && <Posts onUnauthorized={handleLogout} />}
        {currentPage === 'events' && <Events onUnauthorized={handleLogout} />}
        {currentPage === 'rides'  && <Rides onUnauthorized={handleLogout} />}
        {currentPage === 'plan'   && <Plan onUnauthorized={handleLogout} />}
        {currentPage === 'market' && <Marketplace onUnauthorized={handleLogout} />}
      </div>
      <ChatBot onUnauthorized={handleLogout} />
    </div>
  );
}

const Nav = ({ currentPage, setCurrentPage, onLogout, initials }) => (
  <nav className="app-nav">
    <div className="app-nav-inner">
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div className="app-nav-logo" onClick={() => setCurrentPage('dashboard')}>
          Wecampus
        </div>
        <div className="app-nav-links">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`app-nav-link ${currentPage === item.id ? 'is-active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <div className="app-nav-user">
          <span className="app-nav-dot" />
          online
        </div>
        <div
          className="avatar-circle avatar-32"
          title="Профиль"
          style={{ cursor: 'pointer' }}
          onClick={() => setCurrentPage('profile')}
        >
          {initials}
        </div>
        <button type="button" className="app-nav-logout" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  </nav>
);

export default App;
