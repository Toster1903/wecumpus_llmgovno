import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Heart, MessageCircle, Sparkles, X } from 'lucide-react';
import api from '../api/axios';

const ServiceHub = ({
  onUnauthorized,
  onOpenUserProfile,
  initialChatUserId,
  onInitialChatHandled,
}) => {
  const [myProfile, setMyProfile] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [mutualMatches, setMutualMatches] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [miniProfile, setMiniProfile] = useState(null);
  const [isMiniProfileOpen, setIsMiniProfileOpen] = useState(false);
  const [isMiniProfileLoading, setIsMiniProfileLoading] = useState(false);

  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [isSearchingProfiles, setIsSearchingProfiles] = useState(false);
  const [hasSearchedProfiles, setHasSearchedProfiles] = useState(false);

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

  const loadCandidates = useCallback(async () => {
    const response = await api.get('/profiles/match');
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

  const loadConversation = useCallback(async (otherUserId) => {
    if (!otherUserId) {
      setMessages([]);
      return;
    }

    const response = await api.get(`/messages/${otherUserId}`);
    setMessages(response.data || []);
  }, []);

  const openChatWithUser = useCallback(
    (userId, fallbackMessage = 'Написать можно только после взаимного мэтча.') => {
      if (!userId) {
        return false;
      }

      const hasMutualMatch = mutualMatches.some((item) => item.user_id === userId);
      if (!hasMutualMatch) {
        if (fallbackMessage) {
          setErrorMessage(fallbackMessage);
        }
        return false;
      }

      setSelectedUserId(userId);
      setErrorMessage('');
      return true;
    },
    [mutualMatches]
  );

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const [profileResponse] = await Promise.all([
          api.get('/profiles/me'),
          loadCandidates(),
          loadMutualMatches(),
        ]);

        setMyProfile(profileResponse.data);
      } catch (error) {
        handleApiError(error, 'Не удалось загрузить сервисную панель.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [handleApiError, loadCandidates, loadMutualMatches]);

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

  useEffect(() => {
    if (!initialChatUserId || isLoading) {
      return;
    }

    openChatWithUser(initialChatUserId, 'Чат доступен только после взаимного мэтча.');
    onInitialChatHandled?.();
  }, [initialChatUserId, isLoading, onInitialChatHandled, openChatWithUser]);

  const searchProfilesAcrossService = async (event) => {
    event.preventDefault();
    const query = globalSearchQuery.trim();

    if (!query) {
      setGlobalSearchResults([]);
      setHasSearchedProfiles(false);
      return;
    }

    setIsSearchingProfiles(true);
    setErrorMessage('');

    try {
      const response = await api.get('/profiles/search', {
        params: { q: query },
      });
      setGlobalSearchResults(response.data || []);
      setHasSearchedProfiles(true);
    } catch (error) {
      handleApiError(error, 'Не удалось выполнить поиск по сервису.');
    } finally {
      setIsSearchingProfiles(false);
    }
  };

  const clearGlobalSearch = () => {
    setGlobalSearchQuery('');
    setGlobalSearchResults([]);
    setHasSearchedProfiles(false);
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

      await Promise.all([loadCandidates(), loadMutualMatches()]);
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

  const openMiniProfile = async (userId) => {
    if (!userId) {
      return;
    }

    setIsMiniProfileOpen(true);
    setIsMiniProfileLoading(true);
    setErrorMessage('');

    try {
      const response = await api.get(`/profiles/user/${userId}`);
      setMiniProfile(response.data);
    } catch (error) {
      setMiniProfile(null);
      handleApiError(error, 'Не удалось загрузить мини-профиль.');
    } finally {
      setIsMiniProfileLoading(false);
    }
  };

  const closeMiniProfile = () => {
    setIsMiniProfileOpen(false);
    setMiniProfile(null);
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
      {errorMessage && (
        <div className="rounded-xl bg-red-500/10 border border-red-300/50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-cyan-600" />
          <h2 className="text-lg font-semibold text-slate-900">Поиск по сервису</h2>
        </div>

        <form onSubmit={searchProfilesAcrossService} className="flex flex-col md:flex-row gap-2">
          <input
            value={globalSearchQuery}
            onChange={(event) => setGlobalSearchQuery(event.target.value)}
            className="w-full rounded-xl bg-white/70 border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Найти профили по имени или био"
          />
          <button
            type="submit"
            disabled={isSearchingProfiles}
            className="md:w-auto rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium px-4 py-2 transition disabled:opacity-60"
          >
            {isSearchingProfiles ? 'Ищем...' : 'Найти'}
          </button>
          {(globalSearchQuery || hasSearchedProfiles || globalSearchResults.length > 0) && (
            <button
              type="button"
              onClick={clearGlobalSearch}
              className="md:w-auto rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium px-4 py-2 transition"
            >
              Очистить
            </button>
          )}
        </form>

        {hasSearchedProfiles && !isSearchingProfiles && !globalSearchResults.length && (
          <p className="text-sm text-slate-500">Профили не найдены.</p>
        )}

        {globalSearchResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {globalSearchResults.map((profile) => (
              <div
                key={`service-search-${profile.user_id}`}
                className="rounded-xl bg-white/70 border border-slate-200/60 p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">👤</div>
                  )}

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {profile.full_name}, {profile.age}
                    </p>
                    <p className="text-xs text-slate-600 line-clamp-2">{profile.bio}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenUserProfile?.(profile.user_id)}
                    className="rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-2.5 py-1.5"
                  >
                    Профиль
                  </button>
                  <button
                    type="button"
                    onClick={() => openChatWithUser(profile.user_id)}
                    className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-2.5 py-1.5"
                  >
                    Написать
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {currentCandidate && (
          <section className="lg:col-span-5 backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Мэтч</h2>
            </div>

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
                      <Heart size={18} /> Лайк
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section
          className={`${currentCandidate ? 'lg:col-span-7' : 'lg:col-span-12'} backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-4`}
        >
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={18} className="text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">Чат</h2>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
            <div className="space-y-2 xl:col-span-2">
              {!mutualMatches.length && (
                <p className="text-xs text-slate-500">Когда появятся взаимные матчи, здесь будут чаты.</p>
              )}

              {mutualMatches.map((item) => (
                <div
                  key={`chat-${item.user_id}`}
                  className={`w-full rounded-xl px-3 py-2 border transition flex items-center gap-2 ${
                    item.user_id === selectedUserId
                      ? 'bg-indigo-500/15 border-indigo-300/60 text-indigo-900'
                      : 'bg-white/70 border-slate-200/60 text-slate-700 hover:bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openMiniProfile(item.user_id)}
                    className="shrink-0"
                  >
                    {item.avatar_url ? (
                      <img src={item.avatar_url} alt={item.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm">👤</div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => openChatWithUser(item.user_id, null)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <span className="text-sm font-medium block truncate">{item.name}</span>
                    <span className="text-[11px] opacity-70">Открыть чат</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-3 flex flex-col min-h-80 xl:col-span-3 min-w-0">
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
                          <button
                            type="button"
                            onClick={() => openMiniProfile(selectedUserId)}
                            className="rounded-full"
                          >
                            <img src={avatarUrl} alt="Аватар" className="w-7 h-7 rounded-full object-cover" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openMiniProfile(selectedUserId)}
                            className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[11px]"
                          >
                            👤
                          </button>
                        )
                      )}

                      <div
                        className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                          isIncoming
                            ? 'bg-white border border-slate-200/70 text-slate-800'
                            : 'bg-emerald-500/20 border border-emerald-300/60 text-emerald-900'
                        }`}
                      >
                        <span className="break-words">{message.content}</span>
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

              <form onSubmit={sendMessage} className="mt-3 flex flex-col sm:flex-row gap-2 min-w-0">
                <input
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  className="w-full min-w-0 sm:flex-1 rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Введите сообщение"
                  disabled={!selectedUserId || isSendingMessage}
                />
                <button
                  type="submit"
                  disabled={!selectedUserId || !messageText.trim() || isSendingMessage}
                  className="w-full sm:w-auto shrink-0 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-sm disabled:opacity-60"
                >
                  Отправить
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>

      {isMiniProfileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Мини-профиль</h3>
              <button
                type="button"
                onClick={closeMiniProfile}
                className="rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1"
              >
                ✕
              </button>
            </div>

            {isMiniProfileLoading && (
              <p className="text-sm text-slate-500">Загружаем профиль пользователя...</p>
            )}

            {!isMiniProfileLoading && miniProfile && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {miniProfile.avatar_url ? (
                    <img src={miniProfile.avatar_url} alt={miniProfile.full_name} className="w-14 h-14 rounded-xl object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-100 to-cyan-100 flex items-center justify-center text-2xl">
                      👤
                    </div>
                  )}

                  <div>
                    <p className="text-base font-semibold text-slate-900">{miniProfile.full_name}</p>
                    <p className="text-sm text-slate-600">Возраст: {miniProfile.age}</p>
                  </div>
                </div>

                <p className="text-sm text-slate-700 line-clamp-3">{miniProfile.bio}</p>

                <div className="flex flex-wrap gap-2">
                  {(miniProfile.interests || []).slice(0, 6).map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full bg-emerald-500/20 border border-emerald-300/50 px-2 py-0.5 text-xs text-emerald-700"
                    >
                      {interest}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      openChatWithUser(miniProfile.user_id, 'Чат доступен только после взаимного мэтча.');
                      closeMiniProfile();
                    }}
                    className="flex-1 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 text-sm font-medium"
                  >
                    Открыть чат
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenUserProfile?.(miniProfile.user_id);
                      closeMiniProfile();
                    }}
                    className="flex-1 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-2 text-sm font-medium inline-flex items-center justify-center gap-1"
                  >
                    <ExternalLink size={14} />
                    Страница пользователя
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceHub;
