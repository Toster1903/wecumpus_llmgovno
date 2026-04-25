import { useEffect, useState } from 'react';
import api from '../api/axios';

const resolveAvatar = (url) => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `http://localhost:8000${url}`;
};

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
      <div className="elegant-shell">
        <div className="elegant-content">
          <div className="elegant-card">
            <span className="spin" /> Загружаем страницу пользователя...
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage || !profile) {
    return (
      <div className="elegant-shell">
        <div className="elegant-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button type="button" onClick={onBack} className="btn-elegant-ghost" style={{ alignSelf: 'flex-start' }}>
            ← Назад в сервис
          </button>
          <div className="elegant-card">
            <div className="elegant-msg-error">{errorMessage || 'Профиль не найден.'}</div>
          </div>
        </div>
      </div>
    );
  }

  const avatar = resolveAvatar(profile.avatar_url);

  return (
    <div className="elegant-shell">
      <div className="elegant-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={onBack} className="btn-elegant-ghost">
            ← Назад в сервис
          </button>
          <button type="button" onClick={() => onWrite?.(profile.user_id)} className="btn-elegant">
            Написать →
          </button>
        </div>

        <div className="elegant-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.4rem', flexWrap: 'wrap' }}>
            {avatar ? (
              <img
                src={avatar}
                alt={profile.full_name}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '4px solid var(--elegant-card)',
                  boxShadow: '0 12px 30px -16px rgba(0,0,0,0.18)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: 'var(--elegant-accent-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '2.6rem',
                  color: 'var(--elegant-primary)',
                }}
              >
                {(profile.full_name || '·').charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div className="label-mono" style={{ marginBottom: '0.3rem', color: 'var(--elegant-text-muted)' }}>
                Профиль
              </div>
              <h1 className="elegant-title" style={{ marginBottom: '0.2rem' }}>
                {profile.full_name}
              </h1>
              <p className="elegant-sub" style={{ marginBottom: 0 }}>{profile.age} лет</p>
            </div>
          </div>

          <div>
            <div className="elegant-field-label" style={{ marginBottom: '0.4rem' }}>О пользователе</div>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--elegant-text)' }}>
              {profile.bio || 'Без описания'}
            </p>
          </div>

          <div>
            <div className="elegant-field-label" style={{ marginBottom: '0.5rem' }}>Интересы</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {(profile.interests || []).map((interest) => (
                <span key={interest} className="elegant-chip">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
