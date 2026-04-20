import { useCallback, useEffect, useMemo, useState } from 'react';
import { Heart, HeartHandshake, History, MessageCircle, Sparkles, X } from 'lucide-react';
import api from '../api/axios';

const ServiceHub = ({ onUnauthorized }) => {
  const [myProfile, setMyProfile] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [mutualMatches, setMutualMatches] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [interestFilter, setInterestFilter] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleApiError = useCallback(
    (error, fallbackMessage) => {
      if (error?.response?.status === 401) {
        onUnauthorized?.();
        return;
      }
      setErrorMessage(error?.response?.data?.detail || fallbackMessage);
    },
    [onUnauthorized]
  );

  const buildMatchMeta = useCallback((candidate) => {
    const myInterests = (myProfile?.interests || []).map((item) => item.toLowerCase().trim());
    const candidateInterests = (candidate?.interests || []).map((item) => item.toLowerCase().trim());

    const common = candidateInterests.filter((interest) => myInterests.includes(interest));
    const unique = new Set([...myInterests, ...candidateInterests]);
    const interestSimilarity = unique.size ? common.length / unique.size : 0;

    const ageDiff = Math.abs((myProfile?.age || candidate.age) - candidate.age);
    const agePenalty = Math.min(ageDiff * 2, 25);

    const rawScore = 28 + Math.round(interestSimilarity * 52) - agePenalty;
    const score = Math.max(22, Math.min(95, rawScore));

    let reason = `У вас пересекаются интересы: ${common.slice(0, 2).join(', ')}.`;
    if (!common.length) {
      reason = 'Похожие бытовые привычки и стиль анкеты по AI-анализу.';
    }

    return { score, reason };
  }, [myProfile]);

  const loadCandidates = useCallback(async (filters = {}) => {
    const response = await api.get('/profiles/match', { params: filters });
    setCandidates(response.data || []);
  }, []);

  const loadMutualMatches = useCallback(async () => {
    const response = await api.get('/matches/mutual');
    const items = response.data?.mutual_matches || [];
    setMutualMatches(items);
    setSelectedUserId((prev) => {
      if (!items.length) {
        return null;
      }
      if (prev && items.some((item) => item.user_id === prev)) {
        return prev;
      }
      return items[0].user_id;
    });
  }, []);

  const loadHistory = useCallback(async () => {
    const response = await api.get('/matches/history');
    setHistory(response.data?.history || []);
  }, []);

  const loadConversation = useCallback(async (otherUserId) => {
    if (!otherUserId) {
      setMessages([]);
      return;
    }

    const response = await api.get(`/messages/${otherUserId}`);
    setMessages(response.data || []);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const [profileResponse] = await Promise.all([
          api.get('/profiles/me'),
          loadCandidates(),
          loadMutualMatches(),
          loadHistory(),
        ]);

        setMyProfile(profileResponse.data);
      } catch (error) {
        handleApiError(error, 'Не удалось загрузить сервисную панель.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [handleApiError, loadCandidates, loadHistory, loadMutualMatches]);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        await loadConversation(selectedUserId);
      } catch (error) {
        handleApiError(error, 'Не удалось загрузить переписку.');
      }
    };

    loadMessages();
  }, [handleApiError, loadConversation, selectedUserId]);

  const applyFilters = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    try {
      await loadCandidates({
        q: searchQuery || undefined,
        interest: interestFilter || undefined,
      });
    } catch (error) {
      handleApiError(error, 'Не удалось применить фильтры.');
    }
  };

  const resetFilters = async () => {
    setSearchQuery('');
    setInterestFilter('');
    setErrorMessage('');

    try {
      await loadCandidates();
    } catch (error) {
      handleApiError(error, 'Не удалось сбросить фильтры.');
    }
  };

  const sendMatchAction = async (action) => {
    if (!candidates.length || isSubmittingAction) {
      return;
    }

    const currentCandidate = candidates[0];
    setIsSubmittingAction(true);
    setErrorMessage('');

    try {
      await api.post(`/matches/${action}`, {
        matched_user_id: currentCandidate.user_id,
      });

      await Promise.all([
        loadCandidates({
          q: searchQuery || undefined,
          interest: interestFilter || undefined,
        }),
        loadMutualMatches(),
        loadHistory(),
      ]);
    } catch (error) {
      handleApiError(error, 'Не удалось отправить действие.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();

    if (!selectedUserId || !messageText.trim() || isSendingMessage) {
      return;
    }

    setIsSendingMessage(true);
    setErrorMessage('');

    try {
      await api.post('/messages/', {
        receiver_id: selectedUserId,
        content: messageText,
      });
      setMessageText('');
      await loadConversation(selectedUserId);
    } catch (error) {
      handleApiError(error, 'Не удалось отправить сообщение.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const selectedChatUser = useMemo(
    () => mutualMatches.find((item) => item.user_id === selectedUserId) || null,
    [mutualMatches, selectedUserId]
  );

  const currentCandidate = candidates[0] || null;
  const matchMeta = currentCandidate ? buildMatchMeta(currentCandidate) : null;

  if (isLoading) {
    return (
      <div className="backdrop-blur-xl bg-white/50 rounded-3xl border border-white/70 p-8 text-slate-700">
        Загружаем сервис...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="backdrop-blur-xl bg-white/45 border border-white/60 rounded-3xl p-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
          Сервис подбора соседей
        </h1>
        <p className="text-slate-600 mt-2">
          Матчи, история и чат объединены в одной панели. Приватные привычки используются только для поиска соседа по комнате.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-xl bg-red-500/10 border border-red-300/50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <section className="lg:col-span-8 backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">Подбор соседей</h2>
          </div>

          <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="md:col-span-2 rounded-xl bg-white/70 border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Поиск по имени или био"
            />
            <input
              value={interestFilter}
              onChange={(event) => setInterestFilter(event.target.value)}
              className="rounded-xl bg-white/70 border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Интерес"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-3 py-2 transition"
              >
                Применить
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="w-full rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium px-3 py-2 transition"
              >
                Сброс
              </button>
            </div>
          </form>

          {!currentCandidate && (
            <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-6 text-center text-slate-600">
              Подходящих анкет пока нет. Попробуйте изменить фильтры или зайдите позже.
            </div>
          )}

          {currentCandidate && (
            <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-44 h-44 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-100 to-cyan-100 border border-white/70 flex items-center justify-center">
                  {currentCandidate.avatar_url ? (
                    <img src={currentCandidate.avatar_url} alt="Аватар кандидата" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl">👤</span>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">
                        {currentCandidate.full_name}, {currentCandidate.age}
                      </h3>
                      <p className="text-sm text-slate-600">Совместимость: {matchMeta?.score}%</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700">{currentCandidate.bio}</p>

                  <div className="flex flex-wrap gap-2">
                    {(currentCandidate.interests || []).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-emerald-500/20 border border-emerald-300/50 px-2.5 py-1 text-xs text-emerald-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-cyan-700 bg-cyan-500/10 border border-cyan-300/40 rounded-lg px-3 py-2">
                    {matchMeta?.reason}
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => sendMatchAction('skip')}
                      disabled={isSubmittingAction}
                      className="flex-1 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 text-sm font-medium transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
                    >
                      <X size={18} /> Пропустить
                    </button>
                    <button
                      type="button"
                      onClick={() => sendMatchAction('like')}
                      disabled={isSubmittingAction}
                      className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-4 py-2.5 text-sm font-medium transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
                    >
                      <Heart size={18} /> Позвать
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="lg:col-span-4 backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <HeartHandshake size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">Взаимные матчи</h2>
          </div>

          {!mutualMatches.length && (
            <p className="text-sm text-slate-500">Пока нет взаимных совпадений.</p>
          )}

          <div className="space-y-2 max-h-80 overflow-auto pr-1">
            {mutualMatches.map((item) => (
              <button
                type="button"
                key={item.user_id}
                onClick={() => setSelectedUserId(item.user_id)}
                className={`w-full text-left rounded-xl px-3 py-2 border transition flex items-center gap-2 ${
                  item.user_id === selectedUserId
                    ? 'bg-emerald-500/20 border-emerald-300/60 text-emerald-900'
                    : 'bg-white/70 border-slate-200/60 text-slate-700 hover:bg-white'
                }`}
              >
                {item.avatar_url ? (
                  <img src={item.avatar_url} alt={item.name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm">👤</div>
                )}
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs opacity-70">{new Date(item.matched_at).toLocaleDateString()}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="lg:col-span-4 backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <History size={18} className="text-cyan-600" />
            <h2 className="text-lg font-semibold text-slate-900">История действий</h2>
          </div>

          {!history.length && <p className="text-sm text-slate-500">История пока пустая.</p>}

          <div className="space-y-2 max-h-72 overflow-auto pr-1">
            {history.map((item, index) => (
              <div key={`${item.matched_user_name}-${index}`} className="rounded-xl bg-white/70 border border-slate-200/60 px-3 py-2">
                <p className="text-sm text-slate-800">
                  {item.action === 'like' ? 'Лайк' : 'Пропуск'} для {item.matched_user_name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{new Date(item.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-8 backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={18} className="text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">Чат</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              {!mutualMatches.length && (
                <p className="text-xs text-slate-500">Когда появятся взаимные матчи, здесь будут чаты.</p>
              )}

              {mutualMatches.map((item) => (
                <button
                  type="button"
                  key={`chat-${item.user_id}`}
                  onClick={() => setSelectedUserId(item.user_id)}
                  className={`w-full text-left rounded-xl px-3 py-2 border transition flex items-center gap-2 ${
                    item.user_id === selectedUserId
                      ? 'bg-indigo-500/15 border-indigo-300/60 text-indigo-900'
                      : 'bg-white/70 border-slate-200/60 text-slate-700 hover:bg-white'
                  }`}
                >
                  {item.avatar_url ? (
                    <img src={item.avatar_url} alt={item.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm">👤</div>
                  )}
                  <span className="text-sm font-medium">{item.name}</span>
                </button>
              ))}
            </div>

            <div className="md:col-span-2 rounded-2xl border border-slate-200/60 bg-white/60 p-3 flex flex-col min-h-80">
              <div className="flex-1 overflow-auto space-y-2 pr-1">
                {!selectedUserId && (
                  <p className="text-sm text-slate-500">Выберите пользователя из списка слева.</p>
                )}

                {selectedUserId && !messages.length && (
                  <p className="text-sm text-slate-500">Сообщений пока нет. Начните диалог.</p>
                )}

                {messages.map((message) => {
                  const isIncoming = message.sender_id === selectedUserId;
                  const avatarUrl = isIncoming ? selectedChatUser?.avatar_url : myProfile?.avatar_url;

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-2 items-end ${isIncoming ? 'justify-start' : 'justify-end'}`}
                    >
                      {isIncoming && (
                        avatarUrl ? (
                          <img src={avatarUrl} alt="Аватар" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[11px]">👤</div>
                        )
                      )}

                      <div
                        className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                          isIncoming
                            ? 'bg-white border border-slate-200/70 text-slate-800'
                            : 'bg-emerald-500/20 border border-emerald-300/60 text-emerald-900'
                        }`}
                      >
                        {message.content}
                      </div>

                      {!isIncoming && (
                        avatarUrl ? (
                          <img src={avatarUrl} alt="Мой аватар" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-[11px]">👤</div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>

              <form onSubmit={sendMessage} className="mt-3 flex gap-2">
                <input
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  className="flex-1 rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Введите сообщение"
                  disabled={!selectedUserId || isSendingMessage}
                />
                <button
                  type="submit"
                  disabled={!selectedUserId || !messageText.trim() || isSendingMessage}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-sm disabled:opacity-60"
                >
                  Отправить
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ServiceHub;
