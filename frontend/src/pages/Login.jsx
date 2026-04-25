import { useState } from 'react';
import api from '../api/axios';

const Login = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loginWithCredentials = async (loginEmail, loginPassword) => {
    const body = new URLSearchParams();
    body.append('username', loginEmail);
    body.append('password', loginPassword);

    const response = await api.post('/auth/login', body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    onLoginSuccess(response.data.access_token);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        await api.post('/users/', { email, password });
        setSuccessMessage('Аккаунт создан. Выполняем вход...');
      }

      await loginWithCredentials(email, password);
    } catch (error) {
      if (mode === 'register') {
        setErrorMessage(
          error?.response?.data?.detail ||
            'Не удалось зарегистрироваться. Возможно, такой email уже существует.'
        );
      } else {
        setErrorMessage(error?.response?.data?.detail || 'Не удалось войти. Проверьте email и пароль.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const isLogin = mode === 'login';

  return (
    <div className="premium-shell">
      <span className="premium-orb a" />
      <span className="premium-orb b" />
      <span className="premium-orb c" />

      <div className="premium-card">
        <div className="premium-eyebrow">Wecampus · Sunset</div>
        <h1 className="premium-title">
          {isLogin ? (
            <>Welcome <em>back.</em></>
          ) : (
            <>Hello, <em>стажёр.</em></>
          )}
        </h1>
        <p className="premium-sub">
          {isLogin
            ? 'Войди — и я подберу соседей, попутчиков и события на сегодня.'
            : 'Создай аккаунт за минуту — анкету заполним сразу после.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.7rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--premium-text-muted)',
                marginBottom: '0.4rem',
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="premium-input"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.7rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--premium-text-muted)',
                marginBottom: '0.4rem',
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="premium-input"
              placeholder="Ваш пароль"
              required
            />
          </div>

          {errorMessage && <div className="premium-msg-error">{errorMessage}</div>}
          {successMessage && <div className="premium-msg-success">{successMessage}</div>}

          <button type="submit" className="btn-premium" disabled={isSubmitting} style={{ marginTop: '0.4rem' }}>
            {isSubmitting
              ? isLogin
                ? 'Входим...'
                : 'Регистрируем...'
              : isLogin
                ? 'Войти'
                : 'Зарегистрироваться'}
          </button>
        </form>

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
