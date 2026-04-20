import { useEffect, useState } from 'react';
import { HeartHandshake, History, Sparkles } from 'lucide-react';
import api from '../api/axios';

const Dashboard = () => {
  const [mutualMatches, setMutualMatches] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [mutualResponse, historyResponse] = await Promise.all([
          api.get('/matches/mutual'),
          api.get('/matches/history'),
        ]);

        setMutualMatches(mutualResponse.data?.mutual_matches || []);
        setHistory(historyResponse.data?.history || []);
      } catch (error) {
        setErrorMessage(error?.response?.data?.detail || 'Не удалось загрузить панель.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="backdrop-blur-xl bg-white/50 rounded-3xl border border-white/70 p-8 text-slate-700">
        Загружаем панель...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-3xl border border-white/60 p-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-slate-600 mt-2">Обзор ваших активностей и совпадений.</p>
      </div>

      {errorMessage && (
        <div className="rounded-xl bg-red-500/10 border border-red-300/50 px-4 py-3 text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-6">
          <div className="flex items-center gap-2 mb-4">
            <HeartHandshake className="text-emerald-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-900">Взаимные матчи</h2>
          </div>

          {mutualMatches.length === 0 ? (
            <p className="text-slate-500 text-sm">Пока нет взаимных совпадений.</p>
          ) : (
            <div className="space-y-2">
              {mutualMatches.map((item) => (
                <div key={item.user_id} className="rounded-xl bg-white/60 border border-slate-200/60 px-3 py-2">
                  <p className="text-slate-800 font-medium">{item.username}</p>
                  <p className="text-xs text-slate-500">ID: {item.user_id}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="text-cyan-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-900">История действий</h2>
          </div>

          {history.length === 0 ? (
            <p className="text-slate-500 text-sm">История пока пустая.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto pr-1">
              {history.map((item, index) => (
                <div key={`${item.matched_user_id}-${index}`} className="rounded-xl bg-white/60 border border-slate-200/60 px-3 py-2">
                  <p className="text-slate-800 font-medium">
                    {item.action === 'like' ? 'Лайк' : 'Пропуск'} для пользователя #{item.matched_user_id}
                  </p>
                  <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-5 flex items-center gap-3 text-slate-700">
        <Sparkles className="text-amber-500" size={20} />
        Лайки и пропуски теперь отправляются в backend и отображаются в истории.
      </div>
    </div>
  );
};

export default Dashboard;
