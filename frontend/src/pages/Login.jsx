import { useState, useRef, useEffect } from 'react';
import api from '../api/axios';

const Login = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEmailNotVerified, setIsEmailNotVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const telegramContainerRef = useRef(null);

  useEffect(() => {
    const container = telegramContainerRef.current;
    if (!container) return;

    window.onTelegramAuth = async (user) => {
      setIsSubmitting(true);
      setErrorMessage('');
      try {
        const response = await api.post('/auth/telegram', user);
        onLoginSuccess(response.data.access_token);
      } catch {
        setErrorMessage('Не удалось войти через Telegram. Попробуйте ещё раз.');
      } finally {
        setIsSubmitting(false);
      }
    };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute(
      'data-telegram-login',
      import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '',
    );
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;
    container.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
    };
  }, [onLoginSuccess]);

  const loginWithCredentials = async (loginEmail, loginPassword) => {
    const body = new URLSearchParams();
    body.append('username', loginEmail);
    body.append('password', loginPassword);
    const response = await api.post('/auth/login', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    onLoginSuccess(response.data.access_token);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsEmailNotVerified(false);
    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        await api.post('/users/', { email, password });
        setSuccessMessage(
          'Аккаунт создан. Проверьте почту — мы отправили письмо с подтверждением.',
        );
        setIsSubmitting(false);
        return;
      }
      await loginWithCredentials(email, password);
    } catch (error) {
      if (
        error?.response?.status === 403 &&
        error?.response?.data?.detail === 'email_not_verified'
      ) {
        setIsEmailNotVerified(true);
        setErrorMessage('Email не подтверждён. Проверьте почту или запросите письмо повторно.');
      } else {
        const detail = error?.response?.data?.detail;
        const message = Array.isArray(detail)
          ? detail.map((e) => e.msg?.replace(/^Value error, /, '') ?? e).join('; ')
          : typeof detail === 'string'
            ? detail
            : null;

        if (mode === 'register') {
          setErrorMessage(message || 'Не удалось зарегистрироваться. Возможно, такой email уже существует.');
        } else {
          setErrorMessage(message || 'Не удалось войти. Проверьте email и пароль.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    setErrorMessage('');
    try {
      await api.post('/auth/resend-verification', { email });
      setSuccessMessage('Письмо отправлено. Проверьте почту.');
      setIsEmailNotVerified(false);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (detail === 'already_verified') {
        setErrorMessage('Email уже подтверждён. Попробуйте войти.');
      } else {
        setErrorMessage('Не удалось отправить письмо. Попробуйте позже.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const switchMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    setErrorMessage('');
    setSuccessMessage('');
    setIsEmailNotVerified(false);
  };

  const isLogin = mode === 'login';

  const labelStyle = {
    display: 'block',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.7rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--premium-text-muted)',
    marginBottom: '0.4rem',
  };

  return (
    <div className="premium-shell">
      <span className="premium-orb a" />
      <span className="premium-orb b" />
      <span className="premium-orb c" />

      <div className="premium-card">
        <div className="premium-eyebrow">Wecampus · Sunset</div>
        <h1 className="premium-title">
          {isLogin ? <>Welcome <em>back.</em></> : <>Hello, <em>стажёр.</em></>}
        </h1>
        <p className="premium-sub">
          {isLogin
            ? 'Войди — и я подберу соседей, попутчиков и события на сегодня.'
            : 'Создай аккаунт за минуту — анкету заполним сразу после.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="premium-input"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="premium-input"
              placeholder="Ваш пароль"
              required
            />
          </div>

          {errorMessage && <div className="premium-msg-error">{errorMessage}</div>}
          {successMessage && <div className="premium-msg-success">{successMessage}</div>}

          {isEmailNotVerified && (
            <button
              type="button"
              className="btn-premium"
              onClick={handleResendVerification}
              disabled={isResending}
              style={{ background: 'var(--premium-accent-2, #6c63ff)' }}
            >
              {isResending ? 'Отправляем...' : 'Отправить письмо повторно'}
            </button>
          )}

          <button
            type="submit"
            className="btn-premium"
            disabled={isSubmitting}
            style={{ marginTop: '0.4rem' }}
          >
            {isSubmitting
              ? isLogin ? 'Входим...' : 'Регистрируем...'
              : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            margin: '1.2rem 0 0.4rem',
            color: 'var(--premium-text-muted)',
            fontSize: '0.72rem',
          }}
        >
          <span style={{ flex: 1, height: '1px', background: 'var(--premium-border, #333)' }} />
          или
          <span style={{ flex: 1, height: '1px', background: 'var(--premium-border, #333)' }} />
        </div>

        <div ref={telegramContainerRef} style={{ display: 'flex', justifyContent: 'center', minHeight: '40px' }} />

        <div style={{ textAlign: 'center', marginTop: '1.4rem' }}>
          <button type="button" onClick={switchMode} className="premium-link">
            {isLogin ? 'Нет аккаунта · Зарегистрироваться' : 'Уже есть аккаунт · Войти'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
