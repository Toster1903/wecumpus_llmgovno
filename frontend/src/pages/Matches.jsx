import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Heart, X, MapPin, Sparkles } from 'lucide-react';

const Matches = () => {
  const [users, setUsers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    api.get('/profiles/match')
      .then(res => setUsers(res.data))
      .catch(err => {
        if (err?.response?.status === 401) {
          return;
        }
        setErrorMessage('Не удалось загрузить матчи. Попробуйте позже.');
        console.error('Ошибка загрузки матчей', err);
      });
  }, []);

  const handleSkip = () => {
    setCurrentIndex((prev) => (prev + 1) % users.length);
  };

  const handleLike = () => {
    setCurrentIndex((prev) => (prev + 1) % users.length);
  };

  if (errorMessage) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
        {errorMessage}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Sparkles size={48} className="mx-auto mb-4 text-slate-400" />
          <p className="text-xl text-slate-400">Загружаем соседей...</p>
        </div>
      </div>
    );
  }

  const current = users[currentIndex];

  return (
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
                onClick={handleSkip}
                className="flex-1 backdrop-blur-md bg-slate-900/10 hover:bg-slate-900/20 text-slate-700 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 border border-slate-300/50"
              >
                <X size={20} /> Пропустить
              </button>
              <button
                onClick={handleLike}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 shadow-lg"
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
  );
};

export default Matches;
