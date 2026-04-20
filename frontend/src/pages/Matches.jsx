import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Heart, X, MapPin, Sparkles } from 'lucide-react';

const Matches = ({ onUnauthorized }) => {
  const [users, setUsers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [interestFilter, setInterestFilter] = useState('');
  const [minAgeFilter, setMinAgeFilter] = useState('');
  const [maxAgeFilter, setMaxAgeFilter] = useState('');

  const fetchMatches = async (filters = {}) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await api.get('/profiles/match', {
        params: filters,
      });
      setUsers(response.data);
      setCurrentIndex(0);
    } catch (err) {
      if (err?.response?.status === 401) {
        onUnauthorized?.();
        return;
      }
      setErrorMessage('Не удалось загрузить матчи. Попробуйте позже.');
      console.error('Ошибка загрузки матчей', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const handleApplyFilters = async (event) => {
    event.preventDefault();
    await fetchMatches({
      q: searchQuery || undefined,
      interest: interestFilter || undefined,
      min_age: minAgeFilter ? Number(minAgeFilter) : undefined,
      max_age: maxAgeFilter ? Number(maxAgeFilter) : undefined,
    });
  };

  const handleResetFilters = async () => {
    setSearchQuery('');
    setInterestFilter('');
    setMinAgeFilter('');
    setMaxAgeFilter('');
    await fetchMatches();
  };

  const sendAction = async (action) => {
    if (!users.length || isSubmittingAction) {
      return;
    }

    const current = users[currentIndex];
    setIsSubmittingAction(true);
    setErrorMessage('');

    try {
      await api.post(`/matches/${action}`, {
        matched_user_id: current.user_id,
      });

      await fetchMatches();
    } catch (err) {
      if (err?.response?.status === 401) {
        onUnauthorized?.();
        return;
      }
      setErrorMessage('Не удалось отправить действие. Попробуйте снова.');
      console.error('Ошибка отправки действия', err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  if (errorMessage) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
        {errorMessage}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Sparkles size={48} className="mx-auto mb-4 text-slate-400" />
          <p className="text-xl text-slate-400">Загружаем соседей...</p>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center backdrop-blur-xl bg-white/50 border border-white/70 rounded-3xl px-10 py-8">
          <Sparkles size={40} className="mx-auto mb-4 text-emerald-500" />
          <p className="text-xl text-slate-700">Подходящих анкет пока нет</p>
          <p className="text-sm text-slate-500 mt-2">Попробуйте позже, когда появятся новые пользователи.</p>
        </div>
      </div>
    );
  }

  const current = users[currentIndex];

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleApplyFilters}
        className="backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-4 grid grid-cols-4 gap-3"
      >
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="rounded-xl bg-white/70 border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Поиск по имени или био"
        />
        <input
          value={interestFilter}
          onChange={(event) => setInterestFilter(event.target.value)}
          className="rounded-xl bg-white/70 border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Интерес (например chess)"
        />
        <div className="flex gap-2">
          <input
            type="number"
            min="16"
            max="100"
            value={minAgeFilter}
            onChange={(event) => setMinAgeFilter(event.target.value)}
            className="w-full rounded-xl bg-white/70 border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Мин. возраст"
          />
          <input
            type="number"
            min="16"
            max="100"
            value={maxAgeFilter}
            onChange={(event) => setMaxAgeFilter(event.target.value)}
            className="w-full rounded-xl bg-white/70 border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Макс. возраст"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-3 py-2 transition"
          >
            Применить
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            className="w-full rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium px-3 py-2 transition"
          >
            Сброс
          </button>
        </div>
      </form>

      <div className="grid grid-cols-3 gap-6 h-full">
      {/* Left: Match Card */}
      <div className="col-span-1">
        <div className="backdrop-blur-xl bg-white/40 rounded-3xl overflow-hidden border border-white/60 shadow-2xl h-full flex flex-col hover:shadow-3xl transition-all">
          {/* Photo */}
          <div className="relative flex-1 bg-gradient-to-br from-emerald-100 to-cyan-100 flex items-center justify-center">
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <div className="text-slate-400 text-center">
                <div className="text-6xl mb-2">👤</div>
                <p className="text-sm">Фото профиля</p>
              </div>
            </div>
            {/* Match Percentage Badge */}
            <div className="absolute top-4 right-4 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full w-16 h-16 flex items-center justify-center shadow-xl backdrop-blur-md border border-white/40">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">92%</p>
                <p className="text-xs text-white/90">совпадение</p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{current.full_name}, {current.age}</h2>
              <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
                <MapPin size={16} />
                <span>Студоцентр, Корп. 3</span>
              </div>
            </div>

            {/* Interests Tags */}
            <div className="flex flex-wrap gap-2">
              {current.interests.map(tag => (
                <span key={tag} className="backdrop-blur-md bg-emerald-500/20 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium border border-emerald-300/50">
                  {tag}
                </span>
              ))}
            </div>

            {/* Why Match */}
            <div className="backdrop-blur-md bg-cyan-500/10 rounded-lg p-3 border border-cyan-300/30">
              <p className="text-xs text-slate-600 mb-2 font-semibold">Почему вы совпадаете:</p>
              <p className="text-sm text-slate-700 italic">"{current.bio}"</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => sendAction('skip')}
                disabled={isSubmittingAction}
                className="flex-1 backdrop-blur-md bg-slate-900/10 hover:bg-slate-900/20 text-slate-700 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 border border-slate-300/50 disabled:opacity-60"
              >
                <X size={20} /> Пропустить
              </button>
              <button
                onClick={() => sendAction('like')}
                disabled={isSubmittingAction}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
              >
                <Heart size={20} /> Позвать
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Center: Dashboard Placeholder */}
      <div className="col-span-1 backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-6 flex items-center justify-center hover:shadow-lg transition-all">
        <div className="text-center">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-slate-700">Панель управления</p>
          <p className="text-xs text-slate-500 mt-2">Переходите на вкладку "Панель"</p>
        </div>
      </div>

      {/* Right: Profile Builder Placeholder */}
      <div className="col-span-1 backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-6 flex items-center justify-center hover:shadow-lg transition-all">
        <div className="text-center">
          <div className="text-4xl mb-4">👤</div>
          <p className="text-slate-700">Мой профиль</p>
          <p className="text-xs text-slate-500 mt-2">Переходите на вкладку "Профиль"</p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Matches;
