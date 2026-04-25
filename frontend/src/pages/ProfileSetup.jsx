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
    <div className="elegant-shell">
      <div className="elegant-content">
        <div className="elegant-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.6rem' }}>
            <div>
              <div className="label-mono" style={{ marginBottom: '0.4rem', color: 'var(--elegant-text-muted)' }}>
                Step 1 · Profile
              </div>
              <h1 className="elegant-title">Создайте ваш профиль</h1>
              <p className="elegant-sub" style={{ marginBottom: 0 }}>
                Заполните анкету — на её основе AI подберёт совместимых соседей и партнёров по интересам.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="elegant-field-label" htmlFor="fullName">Имя</label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="elegant-input"
                  placeholder="Например, Maya Chen"
                  required
                />
              </div>

              <div>
                <label className="elegant-field-label" htmlFor="age">Возраст</label>
                <input
                  id="age"
                  type="number"
                  min="16"
                  max="100"
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  className="elegant-input"
                  placeholder="20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="elegant-field-label">Аватарка</label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.1rem',
                  background: 'var(--elegant-bg)',
                  border: '1px solid var(--elegant-border)',
                  borderRadius: '14px',
                  padding: '1rem',
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: 'var(--elegant-accent-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '1.6rem',
                    color: 'var(--elegant-primary)',
                    flexShrink: 0,
                  }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Аватар" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    fullName ? fullName.charAt(0).toUpperCase() : '·'
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="btn-elegant"
                      style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
                    >
                      Загрузить фото
                    </button>
                    {!!avatarUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarUrl('');
                          if (avatarInputRef.current) avatarInputRef.current.value = '';
                        }}
                        className="btn-elegant-ghost"
                        style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--elegant-text-faint)' }}>JPG · PNG · WEBP, до 2 МБ.</p>
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
              <label className="elegant-field-label" htmlFor="bio">О себе</label>
              <textarea
                id="bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows="4"
                className="elegant-input"
                placeholder="Кто вы и какого соседа ищете"
                required
              />
            </div>

            <PrivateHabitsForm
              habits={privateHabits}
              onChange={setPrivateHabits}
              title="Приватно для поиска соседей по комнате"
            />

            {errorMessage && <div className="elegant-msg-error">{errorMessage}</div>}
            {isAnalyzing && <div className="elegant-msg-success">{analysisMessage}</div>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <button type="button" className="btn-elegant-ghost" onClick={onLogout}>
                Выйти
              </button>
              <button type="submit" className="btn-elegant" disabled={isSubmitting || isAnalyzing}>
                {isSubmitting ? 'Сохраняем...' : isAnalyzing ? 'AI анализирует...' : 'Создать профиль'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
