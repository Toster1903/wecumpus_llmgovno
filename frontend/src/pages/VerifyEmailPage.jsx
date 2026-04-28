import { useEffect, useState } from 'react';
import api from '../api/axios';

const VerifyEmailPage = ({ onGoToLogin }) => {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      return;
    }
    api
      .get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="premium-shell">
      <span className="premium-orb a" />
      <span className="premium-orb b" />
      <span className="premium-orb c" />
      <div className="premium-card" style={{ textAlign: 'center' }}>
        <div className="premium-eyebrow">Wecampus · Email</div>
        {status === 'loading' && (
          <p className="premium-sub">Проверяем ссылку...</p>
        )}
        {status === 'success' && (
          <>
            <h1 className="premium-title">
              Email <em>подтверждён.</em>
            </h1>
            <p className="premium-sub">Теперь можно войти в аккаунт.</p>
            <button
              type="button"
              className="btn-premium"
              onClick={onGoToLogin}
              style={{ marginTop: '1rem' }}
            >
              Войти
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="premium-title">
              Ссылка <em>недействительна.</em>
            </h1>
            <p className="premium-sub">
              Запросите новое письмо на странице входа.
            </p>
            <button
              type="button"
              className="btn-premium"
              onClick={onGoToLogin}
              style={{ marginTop: '1rem' }}
            >
              На страницу входа
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
