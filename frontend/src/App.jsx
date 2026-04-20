import { useEffect, useState } from 'react';
import Matches from './pages/Matches';
import Dashboard from './pages/Dashboard';
import ProfileBuilder from './pages/ProfileBuilder';
import ProfileSetup from './pages/ProfileSetup';
import Login from './pages/Login';
import Chat from './pages/Chat';
import api from './api/axios';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(localStorage.getItem('token')));
  const [isCheckingProfile, setIsCheckingProfile] = useState(Boolean(localStorage.getItem('token')));
  const [hasProfile, setHasProfile] = useState(false);
  const [currentPage, setCurrentPage] = useState('matches');

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
          localStorage.removeItem('token');
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
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    setCurrentPage('matches');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setHasProfile(false);
    setCurrentPage('matches');
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
          setCurrentPage('matches');
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
                onClick={() => setCurrentPage('matches')}
                className={`px-4 py-2 rounded-lg transition ${
                  currentPage === 'matches'
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                Матчи
              </button>
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`px-4 py-2 rounded-lg transition ${
                  currentPage === 'dashboard'
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                Панель
              </button>
              <button
                onClick={() => setCurrentPage('chat')}
                className={`px-4 py-2 rounded-lg transition ${
                  currentPage === 'chat'
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                Чат
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
        {currentPage === 'matches' && <Matches onUnauthorized={handleLogout} />}
        {currentPage === 'dashboard' && <Dashboard onUnauthorized={handleLogout} />}
        {currentPage === 'chat' && <Chat onUnauthorized={handleLogout} />}
        {currentPage === 'profile' && <ProfileBuilder onUnauthorized={handleLogout} />}
      </div>
    </div>
  );
}

export default App;
