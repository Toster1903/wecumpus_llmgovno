import { useEffect, useState } from 'react';
import { Edit2, Sparkles } from 'lucide-react';
import api from '../api/axios';

const ProfileBuilder = ({ onUnauthorized }) => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const response = await api.get('/profiles/me');
        setProfile(response.data);
      } catch (error) {
        if (error?.response?.status === 401) {
          onUnauthorized?.();
          return;
        }
        setErrorMessage(error?.response?.data?.detail || 'Не удалось загрузить профиль.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [onUnauthorized]);

  const interestsText = profile?.interests?.length ? profile.interests.join(', ') : '';

  const updateField = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!profile) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        full_name: profile.full_name,
        age: Number(profile.age),
        bio: profile.bio,
        interests: (profile.interests || []).map((item) => item.trim()).filter(Boolean),
      };

      const response = await api.patch('/profiles/me', payload);
      setProfile(response.data);
      setSuccessMessage('Профиль сохранен.');
    } catch (error) {
      if (error?.response?.status === 401) {
        onUnauthorized?.();
        return;
      }
      setErrorMessage(error?.response?.data?.detail || 'Не удалось сохранить профиль.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="backdrop-blur-xl bg-white/50 rounded-3xl border border-white/70 p-8 text-slate-700">
        Загружаем профиль...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="backdrop-blur-xl bg-red-500/10 rounded-3xl border border-red-300/50 p-8 text-red-700">
        {errorMessage || 'Профиль не найден.'}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-1 backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 overflow-hidden hover:shadow-lg transition-all">
        <div className="bg-gradient-to-br from-emerald-100 to-cyan-100 h-48 flex items-center justify-center relative border-b border-white/40">
          <div className="text-6xl">👤</div>
          <button className="absolute top-3 right-3 bg-gradient-to-r from-emerald-500 to-emerald-600 p-2 rounded-full shadow-md">
            <Edit2 size={18} className="text-white" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs text-slate-600 font-semibold mb-1">ИМЯ</p>
            <input
              value={profile.full_name}
              onChange={(event) => updateField('full_name', event.target.value)}
              className="w-full rounded-xl backdrop-blur-md bg-white/60 border border-slate-200/70 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <p className="text-xs text-slate-600 font-semibold mb-1">ВОЗРАСТ</p>
            <input
              type="number"
              min="16"
              max="100"
              value={profile.age}
              onChange={(event) => updateField('age', event.target.value)}
              className="w-full rounded-xl backdrop-blur-md bg-white/60 border border-slate-200/70 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <p className="text-xs text-slate-600 font-semibold mb-1">ИНТЕРЕСЫ</p>
            <input
              value={interestsText}
              onChange={(event) => updateField('interests', event.target.value.split(','))}
              className="w-full rounded-xl backdrop-blur-md bg-white/60 border border-slate-200/70 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-slate-500 mt-1">Через запятую</p>
          </div>
        </div>
      </div>

      <div className="col-span-2 backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-6 space-y-4 hover:shadow-lg transition-all">
        <div className="flex items-center gap-2">
          <Sparkles className="text-amber-500" size={24} />
          <h2 className="text-xl font-bold text-slate-900">О себе</h2>
        </div>

        <textarea
          rows="8"
          value={profile.bio}
          onChange={(event) => updateField('bio', event.target.value)}
          className="w-full backdrop-blur-md bg-white/60 border border-slate-300/50 rounded-xl p-4 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        {errorMessage && (
          <div className="rounded-xl bg-red-500/10 border border-red-300/50 px-4 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-300/50 px-4 py-2 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition shadow-md disabled:opacity-70"
        >
          {isSaving ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
};

export default ProfileBuilder;
