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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md backdrop-blur-xl bg-white/40 rounded-3xl shadow-2xl border border-white/60 p-8 hover:shadow-3xl transition-all">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent mb-2">
          {mode === 'login' ? '🦋 Wecupmus' : '🦋 Wecupmus'}
        </h1>
        <p className="text-slate-600 mb-6">
          {mode === 'login'
            ? 'Авторизуйтесь, чтобы смотреть подбор соседей.'
            : 'Создайте аккаунт и сразу войдите в систему.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl backdrop-blur-md bg-white/50 border border-slate-200/60 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl backdrop-blur-md bg-white/50 border border-slate-200/60 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Ваш пароль"
              required
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl backdrop-blur-md bg-red-500/10 border border-red-300/50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl backdrop-blur-md bg-emerald-500/10 border border-emerald-300/50 px-3 py-2 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-2.5 font-medium transition shadow-lg disabled:opacity-70"
          >
            {isSubmitting
              ? mode === 'login'
                ? 'Входим...'
                : 'Регистрируем...'
              : mode === 'login'
                ? 'Войти'
                : 'Зарегистрироваться'}
          </button>
        </form>

        <button
          type="button"
          onClick={switchMode}
          className="mt-5 w-full text-sm text-slate-600 hover:text-slate-900 transition"
        >
          {mode === 'login'
            ? 'Нет аккаунта? Зарегистрироваться'
            : 'Уже есть аккаунт? Войти'}
        </button>
      </div>
    </div>
  );
};

export default Login;
