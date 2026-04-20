import { useEffect, useState } from 'react';
import ProfileBuilder from './pages/ProfileBuilder';
import ProfileSetup from './pages/ProfileSetup';
import Login from './pages/Login';
import ServiceHub from './pages/ServiceHub';
import UserProfilePage from './pages/UserProfilePage';
import api from './api/axios';
import { clearAuthToken, getAuthToken, setAuthToken } from './utils/authToken';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAuthToken()));
  const [isCheckingProfile, setIsCheckingProfile] = useState(Boolean(getAuthToken()));
  const [hasProfile, setHasProfile] = useState(false);
  const [currentPage, setCurrentPage] = useState('service');
  const [selectedUserProfileId, setSelectedUserProfileId] = useState(null);
  const [pendingChatUserId, setPendingChatUserId] = useState(null);

  useEffect(() => {
    const checkProfile = async () => {
      if (!isAuthenticated) {
        setIsCheckingProfile(false);
        setHasProfile(false);
        return;
      }

      setIsCheckingProfile(true);
      try {
        await api.get('/profiles/me');
        setHasProfile(true);
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
    setCurrentPage('service');
  };

  const handleLogout = () => {
    clearAuthToken();
    setIsAuthenticated(false);
    setHasProfile(false);
    setSelectedUserProfileId(null);
    setPendingChatUserId(null);
    setCurrentPage('service');
  };

  const handleOpenUserProfile = (userId) => {
    setSelectedUserProfileId(userId);
    setCurrentPage('userProfile');
  };

  const handleStartChatFromProfile = (userId) => {
    setPendingChatUserId(userId);
    setCurrentPage('service');
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (isCheckingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 text-slate-900 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/50 border border-white/70 rounded-3xl px-8 py-6 text-slate-700">
          Проверяем профиль...
        </div>
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <ProfileSetup
        onProfileCreated={() => {
          setHasProfile(true);
          setCurrentPage('service');
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 text-slate-900">
      {/* Navigation */}
      <nav className="backdrop-blur-xl bg-white/40 border-b border-white/30 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">🦋 Wecupmus</h1>
            <div className="flex gap-4">
              <button
                onClick={() => setCurrentPage('service')}
                className={`px-4 py-2 rounded-lg transition ${
                  currentPage === 'service'
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                Сервис
              </button>
              <button
                onClick={() => setCurrentPage('profile')}
                className={`px-4 py-2 rounded-lg transition ${
                  currentPage === 'profile'
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                Профиль
              </button>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg backdrop-blur-md bg-red-500/30 text-red-700 hover:bg-red-500/50 transition border border-red-300/50"
          >
            Выйти
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {currentPage === 'service' && (
          <ServiceHub
            onUnauthorized={handleLogout}
            onOpenUserProfile={handleOpenUserProfile}
            initialChatUserId={pendingChatUserId}
            onInitialChatHandled={() => setPendingChatUserId(null)}
          />
        )}
        {currentPage === 'profile' && <ProfileBuilder onUnauthorized={handleLogout} />}
        {currentPage === 'userProfile' && (
          <UserProfilePage
            userId={selectedUserProfileId}
            onBack={() => setCurrentPage('service')}
            onUnauthorized={handleLogout}
            onWrite={handleStartChatFromProfile}
          />
        )}
      </div>
    </div>
  );
}

export default App;
