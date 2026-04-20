import { useRef, useState } from 'react';
import api from '../api/axios';
import InterestsInput from '../components/InterestsInput';
import PrivateHabitsForm, { createEmptyHabits, sanitizeHabits } from '../components/PrivateHabitsForm';

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

const ProfileSetup = ({ onProfileCreated, onLogout }) => {
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [privateHabits, setPrivateHabits] = useState(createEmptyHabits());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState('AI анализирует вашу анкету...');
  const [errorMessage, setErrorMessage] = useState('');
  const avatarInputRef = useRef(null);

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setErrorMessage('');

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Для аватарки нужен файл изображения (JPG, PNG, WEBP).');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setErrorMessage('Аватарка слишком большая. Максимальный размер: 2 МБ.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(String(reader.result || ''));
    };
    reader.onerror = () => {
      setErrorMessage('Не удалось прочитать файл аватарки. Попробуйте другой файл.');
    };
    reader.readAsDataURL(file);
  };

  const waitForAnalysis = async () => {
    setIsAnalyzing(true);

    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        const response = await api.get('/profiles/me/status');
        const status = response?.data?.status;
        const message = response?.data?.message;
        if (message) {
          setAnalysisMessage(message);
        }

        if (status === 'ready') {
          onProfileCreated();
          return;
        }

        if (status === 'failed') {
          setErrorMessage('AI-анализ не завершился. Попробуйте сохранить профиль еще раз.');
          setIsAnalyzing(false);
          return;
        }
      } catch (error) {
        if (error?.response?.status === 401) {
          onLogout();
          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    setErrorMessage('AI-анализ занимает больше времени обычного. Подождите немного и обновите страницу.');
    setIsAnalyzing(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const parsedInterests = interests.map((item) => item.trim()).filter(Boolean);

      if (!parsedInterests.length) {
        setErrorMessage('Добавьте хотя бы один интерес.');
        return;
      }

      await api.post('/profiles/', {
        full_name: fullName,
        age: Number(age),
        bio,
        interests: parsedInterests,
        avatar_url: avatarUrl || null,
        private_habits: sanitizeHabits(privateHabits),
      });

      await waitForAnalysis();
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Аватарка</label>
            <div className="rounded-2xl backdrop-blur-md bg-white/60 border border-slate-200/70 p-4 flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-100 to-cyan-100 border border-white/70 flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Аватар" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">👤</span>
                )}
              </div>

              <div className="space-y-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 text-sm transition"
                >
                  Загрузить фото
                </button>

                {!!avatarUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarUrl('');
                      if (avatarInputRef.current) {
                        avatarInputRef.current.value = '';
                      }
                    }}
                    className="block text-sm text-slate-600 hover:text-slate-800"
                  >
                    Удалить фото
                  </button>
                )}

                <p className="text-xs text-slate-500">JPG/PNG/WEBP, до 2 МБ.</p>
              </div>
            </div>
          </div>

          <InterestsInput
            interests={interests}
            onChange={setInterests}
            placeholder="Например, chess"
            helperText="Нажмите Enter или кнопку +, чтобы добавить интерес"
          />

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

          <PrivateHabitsForm
            habits={privateHabits}
            onChange={setPrivateHabits}
            title="Приватно для поиска соседей по комнате"
          />

          {errorMessage && (
            <div className="rounded-xl bg-red-500/10 border border-red-300/50 px-4 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {isAnalyzing && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-300/50 px-4 py-3 text-sm text-emerald-700">
              {analysisMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isAnalyzing}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-2.5 font-medium transition shadow-lg disabled:opacity-70"
          >
            {isSubmitting ? 'Сохраняем...' : isAnalyzing ? 'AI анализирует...' : 'Создать профиль'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
