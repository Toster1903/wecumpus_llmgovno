import { useState } from 'react';
import api from '../api/axios';

const ProfileSetup = ({ onProfileCreated, onLogout }) => {
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const parsedInterests = interests
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      await api.post('/profiles/', {
        full_name: fullName,
        age: Number(age),
        bio,
        interests: parsedInterests,
      });

      onProfileCreated();
    } catch (error) {
      if (error?.response?.status === 401) {
        onLogout();
        return;
      }
      setErrorMessage(error?.response?.data?.detail || 'Не удалось создать профиль.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl backdrop-blur-xl bg-white/50 border border-white/70 rounded-3xl shadow-2xl p-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent mb-2">
          Создайте профиль
        </h1>
        <p className="text-slate-600 mb-6">Заполните анкету, чтобы начать подбор соседей.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="fullName">
                Имя
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-xl backdrop-blur-md bg-white/60 border border-slate-200/70 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Например, Maya Chen"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="age">
                Возраст
              </label>
              <input
                id="age"
                type="number"
                min="16"
                max="100"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                className="w-full rounded-xl backdrop-blur-md bg-white/60 border border-slate-200/70 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="20"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="interests">
              Интересы
            </label>
            <input
              id="interests"
              type="text"
              value={interests}
              onChange={(event) => setInterests(event.target.value)}
              className="w-full rounded-xl backdrop-blur-md bg-white/60 border border-slate-200/70 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="coding, chess, coffee"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Разделяйте интересы запятой.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="bio">
              О себе
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows="4"
              className="w-full rounded-xl backdrop-blur-md bg-white/60 border border-slate-200/70 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Кто вы и какого соседа ищете"
              required
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl bg-red-500/10 border border-red-300/50 px-4 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-2.5 font-medium transition shadow-lg disabled:opacity-70"
          >
            {isSubmitting ? 'Сохраняем...' : 'Создать профиль'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
