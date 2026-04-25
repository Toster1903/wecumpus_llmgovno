import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import InterestsInput from '../components/InterestsInput';
import PrivateHabitsForm, { createEmptyHabits, sanitizeHabits } from '../components/PrivateHabitsForm';

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

const ProfileBuilder = ({ onUnauthorized }) => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [privateHabits, setPrivateHabits] = useState(createEmptyHabits());
  const avatarInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const [profileResponse, privateResponse] = await Promise.all([
          api.get('/profiles/me'),
          api.get('/profiles/me/preferences'),
        ]);

        setProfile(profileResponse.data);
        setPrivateHabits({
          ...createEmptyHabits(),
          ...(privateResponse?.data?.private_habits || {}),
        });
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

  const updateField = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
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
      setProfile((prev) => ({ ...prev, avatar_url: String(reader.result || '') }));
    };
    reader.onerror = () => {
      setErrorMessage('Не удалось прочитать файл аватарки. Попробуйте другой файл.');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        full_name: profile.full_name,
        age: Number(profile.age),
        bio: profile.bio,
        interests: (profile.interests || []).map((item) => item.trim()).filter(Boolean),
        avatar_url: profile.avatar_url || null,
        private_habits: sanitizeHabits(privateHabits),
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
      <div className="elegant-shell">
        <div className="elegant-content">
          <div className="elegant-card">
            <span className="spin" /> Загружаем профиль...
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="elegant-shell">
        <div className="elegant-content">
          <div className="elegant-card">
            <div className="elegant-msg-error">{errorMessage || 'Профиль не найден.'}</div>
          </div>
        </div>
      </div>
    );
  }

  const resolvedAvatar = profile.avatar_url
    ? profile.avatar_url.startsWith('http') || profile.avatar_url.startsWith('data:')
      ? profile.avatar_url
      : `http://localhost:8000${profile.avatar_url}`
    : null;

  return (
    <div className="elegant-shell">
      <div className="elegant-content" style={{ maxWidth: 1080 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }} className="profile-grid">
          <div className="elegant-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                height: 220,
                background: 'linear-gradient(135deg, var(--elegant-accent-light) 0%, #fffaf3 100%)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {resolvedAvatar ? (
                <img src={resolvedAvatar} alt="Аватар" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '5rem', color: 'var(--elegant-primary)' }}>
                  {(profile.full_name || '·').charAt(0).toUpperCase()}
                </div>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                title="Изменить фото"
                style={{
                  position: 'absolute',
                  top: '0.7rem',
                  right: '0.7rem',
                  background: 'var(--elegant-primary)',
                  color: 'white',
                  border: 'none',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                }}
              >
                ✎
              </button>
            </div>

            <div style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label className="elegant-field-label">Имя</label>
                <input
                  value={profile.full_name || ''}
                  onChange={(event) => updateField('full_name', event.target.value)}
                  className="elegant-input"
                />
              </div>

              <div>
                <label className="elegant-field-label">Возраст</label>
                <input
                  type="number"
                  min="16"
                  max="100"
                  value={profile.age ?? ''}
                  onChange={(event) => updateField('age', event.target.value)}
                  className="elegant-input"
                />
              </div>

              <InterestsInput
                interests={profile.interests || []}
                onChange={(nextInterests) => updateField('interests', nextInterests)}
                helperText="Enter или + для добавления"
              />

              {!!profile.avatar_url && (
                <button
                  type="button"
                  onClick={() => {
                    updateField('avatar_url', null);
                    if (avatarInputRef.current) avatarInputRef.current.value = '';
                  }}
                  className="btn-elegant-ghost"
                  style={{ alignSelf: 'flex-start' }}
                >
                  Удалить фото
                </button>
              )}
            </div>
          </div>

          <div className="elegant-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="label-mono" style={{ color: 'var(--elegant-text-muted)' }}>About</div>
            <h2 className="elegant-title" style={{ fontSize: '1.8rem', marginBottom: 0 }}>
              О себе
            </h2>

            <textarea
              rows="8"
              value={profile.bio || ''}
              onChange={(event) => updateField('bio', event.target.value)}
              className="elegant-input"
              placeholder="Расскажите о себе"
            />

            <PrivateHabitsForm
              habits={privateHabits}
              onChange={setPrivateHabits}
              title="Приватно для поиска соседей"
            />

            {errorMessage && <div className="elegant-msg-error">{errorMessage}</div>}
            {successMessage && <div className="elegant-msg-success">{successMessage}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSave} disabled={isSaving} className="btn-elegant">
                {isSaving ? 'Сохраняем...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileBuilder;
