import { useCallback, useEffect, useState } from 'react';
import { Heart, MapPin, Sparkles, X } from 'lucide-react';
import api from '../api/axios';

const resolveUrl = (url) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `http://localhost:8000${url}`;
};

const MatchesPage = ({ onUnauthorized, onOpenUserProfile }) => {
  const [candidates, setCandidates] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState('');
  const [aiReason, setAiReason] = useState('');
  const [isLoadingReason, setIsLoadingReason] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [interestFilter, setInterestFilter] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');

  const load = useCallback(async (filters = {}) => {
    setIsLoading(true);
    setError('');
    setAiReason('');
    try {
      const [profRes, candRes] = await Promise.all([
        api.get('/profiles/me'),
        api.get('/profiles/match', { params: filters }),
      ]);
      setMyProfile(profRes.data);
      setCandidates(candRes.data || []);
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError('Не удалось загрузить анкеты.');
    } finally {
      setIsLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => { load(); }, [load]);

  const fetchAiReason = useCallback(async (candidateId) => {
    setIsLoadingReason(true);
    setAiReason('');
    try {
      const res = await api.post('/ai/match-explain', { candidate_user_id: candidateId });
      setAiReason(res.data.reason || '');
    } catch {
      setAiReason('');
    } finally {
      setIsLoadingReason(false);
    }
  }, []);

  useEffect(() => {
    if (candidates[0]?.user_id) {
      fetchAiReason(candidates[0].user_id);
    }
  }, [candidates, fetchAiReason]);

  const act = async (action) => {
    if (!candidates.length || isActing) return;
    const current = candidates[0];
    setIsActing(true);
    try {
      await api.post(`/matches/${action}`, { matched_user_id: current.user_id });
      setCandidates((prev) => prev.slice(1));
      setAiReason('');
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError('Не удалось отправить действие.');
    } finally {
      setIsActing(false);
    }
  };

  const applyFilters = async (e) => {
    e.preventDefault();
    await load({
      q: searchQuery || undefined,
      interest: interestFilter || undefined,
      min_age: minAge ? Number(minAge) : undefined,
      max_age: maxAge ? Number(maxAge) : undefined,
    });
  };

  const computeScore = (candidate) => {
    const myInt = (myProfile?.interests || []).map((i) => i.toLowerCase());
    const cInt = (candidate.interests || []).map((i) => i.toLowerCase());
    const common = cInt.filter((i) => myInt.includes(i));
    const union = new Set([...myInt, ...cInt]);
    const sim = union.size ? common.length / union.size : 0;
    const age = Math.abs((myProfile?.age || candidate.age) - candidate.age);
    return Math.max(22, Math.min(95, 28 + Math.round(sim * 52) - Math.min(age * 2, 25)));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Sparkles size={48} className="mx-auto mb-4 text-slate-400 animate-pulse" />
          <p className="text-xl text-slate-400">Ищем соседей...</p>
        </div>
      </div>
    );
  }

  const current = candidates[0] || null;
  const score = current ? computeScore(current) : 0;

  return (
    <div className="hub-shell-inline space-y-4">
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-300/50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Filters */}
      <form
        onSubmit={applyFilters}
        className="backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-4 grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-xl bg-white/70 border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Имя или bio"
        />
        <input
          value={interestFilter}
          onChange={(e) => setInterestFilter(e.target.value)}
          className="rounded-xl bg-white/70 border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Интерес"
        />
        <div className="flex gap-2">
          <input
            type="number" min="16" max="100"
            value={minAge} onChange={(e) => setMinAge(e.target.value)}
            className="w-full rounded-xl bg-white/70 border border-slate-200 px-3 py-2 text-sm focus:outline-none"
            placeholder="Мин. возраст"
          />
          <input
            type="number" min="16" max="100"
            value={maxAge} onChange={(e) => setMaxAge(e.target.value)}
            className="w-full rounded-xl bg-white/70 border border-slate-200 px-3 py-2 text-sm focus:outline-none"
            placeholder="Макс."
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-3 py-2 transition">
            Найти
          </button>
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setInterestFilter(''); setMinAge(''); setMaxAge(''); load(); }}
            className="w-full rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm px-3 py-2 transition"
          >
            Сброс
          </button>
        </div>
      </form>

      {!current ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center backdrop-blur-xl bg-white/50 border border-white/70 rounded-3xl px-10 py-8">
            <Sparkles size={40} className="mx-auto mb-4 text-emerald-500" />
            <p className="text-xl text-slate-700">Анкет пока нет</p>
            <p className="text-sm text-slate-500 mt-2">Попробуйте сбросить фильтры или зайдите позже.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main card */}
          <div className="lg:col-span-1 backdrop-blur-xl bg-white/40 rounded-3xl overflow-hidden border border-white/60 shadow-2xl flex flex-col">
            {/* Photo */}
            <div className="relative h-72 bg-gradient-to-br from-emerald-100 to-cyan-100">
              {current.avatar_url ? (
                <img
                  src={resolveUrl(current.avatar_url)}
                  alt="Аватар"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-7xl">👤</div>
              )}
              <div className="absolute top-4 right-4 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full w-16 h-16 flex items-center justify-center shadow-xl border border-white/40">
                <div className="text-center">
                  <p className="text-xl font-bold text-white leading-none">{score}%</p>
                  <p className="text-[10px] text-white/90">совпад.</p>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="p-5 flex flex-col gap-3 flex-1">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{current.full_name}, {current.age}</h2>
                <div className="flex items-center gap-1 text-slate-500 text-sm mt-0.5">
                  <MapPin size={14} />
                  <span>Кампус Сириус</span>
                </div>
              </div>

              {current.bio && <p className="text-sm text-slate-600 line-clamp-2">{current.bio}</p>}

              <div className="flex flex-wrap gap-1.5">
                {(current.interests || []).map((tag) => (
                  <span key={tag} className="rounded-full bg-emerald-500/20 text-emerald-700 px-2.5 py-0.5 text-xs border border-emerald-300/50">
                    {tag}
                  </span>
                ))}
              </div>

              {/* AI reason */}
              <div className="rounded-xl bg-cyan-500/10 border border-cyan-300/30 p-3 min-h-12 flex items-center">
                {isLoadingReason ? (
                  <p className="text-xs text-slate-400 italic">AI анализирует совместимость...</p>
                ) : aiReason ? (
                  <p className="text-xs text-slate-700 italic">"{aiReason}"</p>
                ) : (
                  <p className="text-xs text-slate-400 italic">Общие интересы с вами.</p>
                )}
              </div>

              <div className="flex gap-3 mt-auto">
                <button
                  type="button"
                  onClick={() => act('skip')}
                  disabled={isActing}
                  className="flex-1 rounded-xl bg-slate-900/10 hover:bg-slate-900/20 text-slate-700 py-3 font-medium transition flex items-center justify-center gap-2 border border-slate-300/50 disabled:opacity-60"
                >
                  <X size={20} /> Пропустить
                </button>
                <button
                  type="button"
                  onClick={() => act('like')}
                  disabled={isActing}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
                >
                  <Heart size={20} /> Лайк
                </button>
              </div>

              <button
                type="button"
                onClick={() => onOpenUserProfile?.(current.user_id)}
                className="text-xs text-center text-slate-500 hover:text-slate-700 underline underline-offset-2"
              >
                Открыть полный профиль
              </button>
            </div>
          </div>

          {/* Queue preview */}
          <div className="lg:col-span-2 backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              В очереди · {candidates.length} анкет
            </h3>
            {candidates.length <= 1 ? (
              <p className="text-sm text-slate-400">После текущей анкеты очередь пуста.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {candidates.slice(1, 7).map((c) => (
                  <div key={c.user_id} className="rounded-2xl bg-white/70 border border-slate-200/60 p-3 flex items-center gap-2">
                    {c.avatar_url ? (
                      <img src={resolveUrl(c.avatar_url)} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-lg shrink-0">👤</div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{c.full_name}</p>
                      <p className="text-xs text-slate-500">{c.age} лет</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchesPage;
