import { useEffect, useState } from 'react';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import api from '../api/axios';

const UserProfilePage = ({ userId, onBack, onUnauthorized, onWrite }) => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setErrorMessage('Пользователь не выбран.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await api.get(`/profiles/user/${userId}`);
        setProfile(response.data);
      } catch (error) {
        if (error?.response?.status === 401) {
          onUnauthorized?.();
          return;
        }
        setErrorMessage(error?.response?.data?.detail || 'Не удалось загрузить страницу пользователя.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [onUnauthorized, userId]);

  if (isLoading) {
    return (
      <div className="backdrop-blur-xl bg-white/50 rounded-3xl border border-white/70 p-8 text-slate-700">
        Загружаем страницу пользователя...
      </div>
    );
  }

  if (errorMessage || !profile) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg bg-white/70 border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-white inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Назад в сервис
        </button>

        <div className="rounded-xl bg-red-500/10 border border-red-300/50 px-4 py-3 text-red-700 text-sm">
          {errorMessage || 'Профиль не найден.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="rounded-lg bg-white/70 border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-white inline-flex items-center gap-2"
      >
        <ArrowLeft size={16} /> Назад в сервис
      </button>

      <button
        type="button"
        onClick={() => onWrite?.(profile.user_id)}
        className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 text-sm inline-flex items-center gap-2"
      >
        <MessageCircle size={16} /> Написать
      </button>

      <div className="backdrop-blur-xl bg-white/50 border border-white/70 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} className="w-20 h-20 rounded-2xl object-cover border border-white/70" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-cyan-100 flex items-center justify-center text-3xl border border-white/70">
              👤
            </div>
          )}

          <div>
            <h1 className="text-2xl font-bold text-slate-900">{profile.full_name}</h1>
            <p className="text-slate-600">Возраст: {profile.age}</p>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-1">О пользователе</h2>
          <p className="text-slate-700 text-sm">{profile.bio}</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Интересы</h2>
          <div className="flex flex-wrap gap-2">
            {(profile.interests || []).map((interest) => (
              <span
                key={interest}
                className="rounded-full bg-emerald-500/20 border border-emerald-300/50 px-2.5 py-1 text-xs text-emerald-700"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
