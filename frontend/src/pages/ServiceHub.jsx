import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  CircleX,
  ExternalLink,
  Heart,
  MessageCircle,
  Settings,
  Sparkles,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import api from '../api/axios';

const EMPTY_NEW_CLUB_FORM = {
  name: '',
  description: '',
  tags: [],
};

const ServiceHub = ({
  onUnauthorized,
  onOpenUserProfile,
  initialChatUserId,
  onInitialChatHandled,
}) => {
  const [myProfile, setMyProfile] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [mutualMatches, setMutualMatches] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [miniProfile, setMiniProfile] = useState(null);
  const [isMiniProfileOpen, setIsMiniProfileOpen] = useState(false);
  const [isMiniProfileLoading, setIsMiniProfileLoading] = useState(false);

  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [isSearchingProfiles, setIsSearchingProfiles] = useState(false);
  const [hasSearchedProfiles, setHasSearchedProfiles] = useState(false);

  const [pendingClubInvites, setPendingClubInvites] = useState([]);
  const [isClubPanelOpen, setIsClubPanelOpen] = useState(false);
  const [managedClubId, setManagedClubId] = useState(null);
  const [managedClubDetail, setManagedClubDetail] = useState(null);

  const [newClubForm, setNewClubForm] = useState(EMPTY_NEW_CLUB_FORM);
  const [newClubTagDraft, setNewClubTagDraft] = useState('');
  const [newClubAvatarFile, setNewClubAvatarFile] = useState(null);
  const [newClubAvatarPreview, setNewClubAvatarPreview] = useState('');

  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteSuggestions, setInviteSuggestions] = useState([]);
  const [selectedInviteUser, setSelectedInviteUser] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isCreatingClub, setIsCreatingClub] = useState(false);
  const [isSearchingInviteUsers, setIsSearchingInviteUsers] = useState(false);
  const [isSendingClubInvite, setIsSendingClubInvite] = useState(false);
  const [handlingClubInviteId, setHandlingClubInviteId] = useState(null);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const resolveAvatarUrl = useCallback((avatarUrl) => {
    if (!avatarUrl) {
      return null;
    }
    if (/^https?:\/\//i.test(avatarUrl)) {
      return avatarUrl;
    }
    return `http://localhost:8000${avatarUrl}`;
  }, []);

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
  }, []);

  const loadClubs = useCallback(async () => {
    const response = await api.get('/clubs/');
    const items = response.data || [];
    setClubs(items);
    setManagedClubId((prev) => {
      if (prev && items.some((club) => club.id === prev)) {
        return prev;
      }
      return items[0]?.id || null;
    });
  }, []);

  const loadPendingClubInvites = useCallback(async () => {
    const response = await api.get('/clubs/invites/me');
    setPendingClubInvites(response.data || []);
  }, []);

  const loadManagedClubDetail = useCallback(async (clubId) => {
    if (!clubId) {
      setManagedClubDetail(null);
      return;
    }

    const response = await api.get(`/clubs/${clubId}`);
    setManagedClubDetail(response.data);
  }, []);

  const loadMessagesForChat = useCallback(async (chat) => {
    if (!chat) {
      setMessages([]);
      return;
    }

    if (chat.type === 'club') {
      const response = await api.get(`/messages/clubs/${chat.id}`);
      setMessages(response.data || []);
      return;
    }

    const response = await api.get(`/messages/${chat.id}`);
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

      setActiveChat({ type: 'user', id: userId });
      setErrorMessage('');
      return true;
    },
    [mutualMatches]
  );

  const openClubChat = useCallback(
    (clubId) => {
      if (!clubId) {
        return;
      }

      const hasClub = clubs.some((club) => club.id === clubId);
      if (!hasClub) {
        setErrorMessage('Клуб не найден в вашем списке.');
        return;
      }

      setActiveChat({ type: 'club', id: clubId });
      setErrorMessage('');
    },
    [clubs]
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
          loadClubs(),
          loadPendingClubInvites(),
        ]);

        setMyProfile(profileResponse.data);
      } catch (error) {
        handleApiError(error, 'Не удалось загрузить сервисную панель.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [handleApiError, loadCandidates, loadClubs, loadMutualMatches, loadPendingClubInvites]);

  const effectiveActiveChat = useMemo(() => {
    if (activeChat?.type === 'user' && mutualMatches.some((item) => item.user_id === activeChat.id)) {
      return activeChat;
    }

    if (activeChat?.type === 'club' && clubs.some((club) => club.id === activeChat.id)) {
      return activeChat;
    }

    if (mutualMatches.length > 0) {
      return { type: 'user', id: mutualMatches[0].user_id };
    }

    if (clubs.length > 0) {
      return { type: 'club', id: clubs[0].id };
    }

    return null;
  }, [activeChat, mutualMatches, clubs]);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        await loadMessagesForChat(effectiveActiveChat);
      } catch (error) {
        handleApiError(error, 'Не удалось загрузить переписку.');
      }
    };

    loadMessages();
  }, [effectiveActiveChat, handleApiError, loadMessagesForChat]);

  useEffect(() => {
    if (!initialChatUserId || isLoading) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const canOpenChat = mutualMatches.some((item) => item.user_id === initialChatUserId);
      if (canOpenChat) {
        setActiveChat({ type: 'user', id: initialChatUserId });
        setErrorMessage('');
      } else {
        setErrorMessage('Чат доступен только после взаимного мэтча.');
      }
      onInitialChatHandled?.();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [initialChatUserId, isLoading, mutualMatches, onInitialChatHandled]);

  useEffect(() => {
    if (!isClubPanelOpen || !managedClubId) {
      return;
    }

    const loadDetail = async () => {
      try {
        await loadManagedClubDetail(managedClubId);
      } catch (error) {
        handleApiError(error, 'Не удалось загрузить настройки клуба.');
      }
    };

    loadDetail();
  }, [isClubPanelOpen, managedClubId, loadManagedClubDetail, handleApiError]);

  useEffect(() => {
    if (!isClubPanelOpen || !managedClubId || selectedInviteUser) {
      return;
    }

    const query = inviteQuery.trim();
    if (query.length < 2) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearchingInviteUsers(true);
      try {
        const response = await api.get('/clubs/users/search', {
          params: {
            q: query,
            club_id: managedClubId,
          },
        });
        setInviteSuggestions(response.data || []);
      } catch (error) {
        handleApiError(error, 'Не удалось выполнить поиск пользователей для приглашения.');
      } finally {
        setIsSearchingInviteUsers(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [
    inviteQuery,
    isClubPanelOpen,
    managedClubId,
    handleApiError,
    selectedInviteUser,
  ]);

  useEffect(() => {
    return () => {
      if (newClubAvatarPreview && newClubAvatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(newClubAvatarPreview);
      }
    };
  }, [newClubAvatarPreview]);

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

    if (!effectiveActiveChat || !messageText.trim() || isSendingMessage) {
      return;
    }

    setIsSendingMessage(true);
    setErrorMessage('');

    try {
      if (effectiveActiveChat.type === 'club') {
        await api.post(`/messages/clubs/${effectiveActiveChat.id}`, {
          content: messageText,
        });
      } else {
        await api.post('/messages/', {
          receiver_id: effectiveActiveChat.id,
          content: messageText,
        });
      }

      setMessageText('');
      await loadMessagesForChat(effectiveActiveChat);
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

  const addNewClubTag = () => {
    const tag = newClubTagDraft.trim().toLowerCase();
    if (!tag) {
      return;
    }

    setNewClubForm((prev) => {
      if (prev.tags.includes(tag)) {
        return prev;
      }

      return {
        ...prev,
        tags: [...prev.tags, tag].slice(0, 15),
      };
    });
    setNewClubTagDraft('');
  };

  const removeNewClubTag = (tag) => {
    setNewClubForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((item) => item !== tag),
    }));
  };

  const onNewClubTagKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addNewClubTag();
    }
  };

  const onNewClubAvatarChange = (event) => {
    const nextFile = event.target.files?.[0] || null;

    if (newClubAvatarPreview && newClubAvatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(newClubAvatarPreview);
    }

    setNewClubAvatarFile(nextFile);

    if (!nextFile) {
      setNewClubAvatarPreview('');
      return;
    }

    setNewClubAvatarPreview(URL.createObjectURL(nextFile));
  };

  const createClubInsideService = async (event) => {
    event.preventDefault();

    if (!newClubForm.name.trim()) {
      setErrorMessage('Введите название клуба.');
      return;
    }

    setIsCreatingClub(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('name', newClubForm.name.trim());
      if (newClubForm.description.trim()) {
        formData.append('description', newClubForm.description.trim());
      }
      formData.append('tags_json', JSON.stringify(newClubForm.tags));
      if (newClubAvatarFile) {
        formData.append('avatar_file', newClubAvatarFile);
      }

      const response = await api.post('/clubs/', formData);
      const createdClub = response.data;

      setNewClubForm(EMPTY_NEW_CLUB_FORM);
      setNewClubTagDraft('');
      setNewClubAvatarFile(null);
      if (newClubAvatarPreview && newClubAvatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(newClubAvatarPreview);
      }
      setNewClubAvatarPreview('');
      setSuccessMessage('Клуб создан и добавлен в чаты.');

      await Promise.all([loadClubs(), loadPendingClubInvites()]);
      setManagedClubId(createdClub.id);
      await loadManagedClubDetail(createdClub.id);
      setActiveChat({ type: 'club', id: createdClub.id });
    } catch (error) {
      handleApiError(error, 'Не удалось создать клуб.');
    } finally {
      setIsCreatingClub(false);
    }
  };

  const handleClubInviteDecision = async (inviteId, action) => {
    setHandlingClubInviteId(inviteId);
    setErrorMessage('');

    try {
      const response = await api.post(`/clubs/invites/${inviteId}/${action}`);
      await Promise.all([loadClubs(), loadPendingClubInvites()]);

      if (action === 'accept') {
        const joinedClub = response.data;
        setActiveChat({ type: 'club', id: joinedClub.id });
        setSuccessMessage('Вы вступили в клуб, чат клуба добавлен в список.');
      } else {
        setSuccessMessage('Приглашение в клуб отклонено.');
      }
    } catch (error) {
      handleApiError(error, 'Не удалось обработать приглашение в клуб.');
    } finally {
      setHandlingClubInviteId(null);
    }
  };

  const sendInviteToSelectedUser = async () => {
    if (!managedClubId || !selectedInviteUser || isSendingClubInvite) {
      return;
    }

    setIsSendingClubInvite(true);
    setErrorMessage('');

    try {
      await api.post(`/clubs/${managedClubId}/invite`, {
        user_id: selectedInviteUser.user_id,
      });

      setSuccessMessage('Приглашение отправлено.');
      setInviteQuery('');
      setInviteSuggestions([]);
      setSelectedInviteUser(null);
      await loadManagedClubDetail(managedClubId);
    } catch (error) {
      handleApiError(error, 'Не удалось отправить приглашение в клуб.');
    } finally {
      setIsSendingClubInvite(false);
    }
  };

  const selectedChatUser = useMemo(() => {
    if (effectiveActiveChat?.type !== 'user') {
      return null;
    }
    return mutualMatches.find((item) => item.user_id === effectiveActiveChat.id) || null;
  }, [effectiveActiveChat, mutualMatches]);

  const selectedChatClub = useMemo(() => {
    if (effectiveActiveChat?.type !== 'club') {
      return null;
    }
    return clubs.find((club) => club.id === effectiveActiveChat.id) || null;
  }, [effectiveActiveChat, clubs]);

  const isClubChatActive = effectiveActiveChat?.type === 'club';

  const visibleInviteSuggestions = useMemo(() => {
    const query = inviteQuery.trim();
    if (!isClubPanelOpen || !managedClubId || selectedInviteUser || query.length < 2) {
      return [];
    }
    return inviteSuggestions;
  }, [inviteQuery, inviteSuggestions, isClubPanelOpen, managedClubId, selectedInviteUser]);

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

      {successMessage && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-300/50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
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
                    <img src={resolveAvatarUrl(profile.avatar_url)} alt={profile.full_name} className="w-10 h-10 rounded-full object-cover" />
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
                    <img src={resolveAvatarUrl(currentCandidate.avatar_url)} alt="Аватар кандидата" className="w-full h-full object-cover" />
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
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} className="text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Чаты</h2>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsClubPanelOpen(true);
                setErrorMessage('');
                setInviteQuery('');
                setInviteSuggestions([]);
                setSelectedInviteUser(null);
              }}
              className="rounded-xl bg-indigo-500/15 border border-indigo-300/60 text-indigo-700 text-sm px-3 py-1.5 inline-flex items-center gap-1.5 hover:bg-indigo-500/25"
            >
              <Settings size={15} /> Настроить клубы
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
            <div className="space-y-3 xl:col-span-2">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Личные чаты</p>
                {!mutualMatches.length && (
                  <p className="text-xs text-slate-500">Когда появятся взаимные матчи, здесь будут личные чаты.</p>
                )}

                {mutualMatches.map((item) => (
                  <div
                    key={`chat-user-${item.user_id}`}
                    className={`w-full rounded-xl px-3 py-2 border transition flex items-center gap-2 ${
                      effectiveActiveChat?.type === 'user' && effectiveActiveChat.id === item.user_id
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
                        <img src={resolveAvatarUrl(item.avatar_url)} alt={item.name} className="w-8 h-8 rounded-full object-cover" />
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
                      <span className="text-[11px] opacity-70">Личный диалог</span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200/60">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Клубные чаты</p>
                {!clubs.length && (
                  <p className="text-xs text-slate-500">Создайте клуб в настройках, чтобы здесь появился чат группы.</p>
                )}

                {clubs.map((club) => (
                  <button
                    type="button"
                    key={`chat-club-${club.id}`}
                    onClick={() => openClubChat(club.id)}
                    className={`w-full rounded-xl px-3 py-2 border transition flex items-center gap-2 text-left ${
                      effectiveActiveChat?.type === 'club' && effectiveActiveChat.id === club.id
                        ? 'bg-emerald-500/15 border-emerald-300/60 text-emerald-900'
                        : 'bg-white/70 border-slate-200/60 text-slate-700 hover:bg-white'
                    }`}
                  >
                    {club.avatar_url ? (
                      <img src={resolveAvatarUrl(club.avatar_url)} alt={club.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-xs shrink-0">🏷️</div>
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="text-sm font-medium block truncate">{club.name}</span>
                      <span className="text-[11px] opacity-70">Участников: {club.member_count}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-3 flex flex-col min-h-80 xl:col-span-3 min-w-0">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                {!effectiveActiveChat && <p className="text-sm text-slate-500">Выберите чат слева.</p>}

                {effectiveActiveChat?.type === 'user' && selectedChatUser && (
                  <>
                    {selectedChatUser.avatar_url ? (
                      <img src={resolveAvatarUrl(selectedChatUser.avatar_url)} alt={selectedChatUser.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs">👤</div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-900 truncate">{selectedChatUser.name}</p>
                      <p className="text-xs text-slate-500">Личный чат</p>
                    </div>
                  </>
                )}

                {effectiveActiveChat?.type === 'club' && selectedChatClub && (
                  <>
                    {selectedChatClub.avatar_url ? (
                      <img src={resolveAvatarUrl(selectedChatClub.avatar_url)} alt={selectedChatClub.name} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-xs">🏷️</div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-900 truncate">{selectedChatClub.name}</p>
                      <p className="text-xs text-slate-500">Чат клуба</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex-1 overflow-auto space-y-2 pr-1 pt-2">
                {!effectiveActiveChat && (
                  <p className="text-sm text-slate-500">Выберите пользователя или клуб из списка слева.</p>
                )}

                {effectiveActiveChat && !messages.length && (
                  <p className="text-sm text-slate-500">Сообщений пока нет. Начните диалог.</p>
                )}

                {messages.map((message) => {
                  const isIncoming = message.sender_id !== myProfile?.user_id;
                  const incomingAvatarUrl = isClubChatActive
                    ? resolveAvatarUrl(message.sender_avatar_url)
                    : resolveAvatarUrl(selectedChatUser?.avatar_url);
                  const myAvatarUrl = resolveAvatarUrl(myProfile?.avatar_url);

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-2 items-end ${isIncoming ? 'justify-start' : 'justify-end'}`}
                    >
                      {isIncoming && (
                        incomingAvatarUrl ? (
                          <button
                            type="button"
                            onClick={() => openMiniProfile(message.sender_id)}
                            className="rounded-full"
                          >
                            <img src={incomingAvatarUrl} alt="Аватар" className="w-7 h-7 rounded-full object-cover" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openMiniProfile(message.sender_id)}
                            className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[11px]"
                          >
                            👤
                          </button>
                        )
                      )}

                      <div
                        className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                          isIncoming
                            ? 'bg-white border border-slate-200/70 text-slate-800'
                            : 'bg-emerald-500/20 border border-emerald-300/60 text-emerald-900'
                        }`}
                      >
                        {isClubChatActive && isIncoming && (
                          <p className="text-[11px] text-slate-500 mb-0.5">
                            {message.sender_name || `Пользователь #${message.sender_id}`}
                          </p>
                        )}
                        <span className="break-words">{message.content}</span>
                      </div>

                      {!isIncoming && (
                        myAvatarUrl ? (
                          <img src={myAvatarUrl} alt="Мой аватар" className="w-7 h-7 rounded-full object-cover" />
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
                  placeholder={isClubChatActive ? 'Сообщение в чат клуба' : 'Введите сообщение'}
                  disabled={!effectiveActiveChat || isSendingMessage}
                />
                <button
                  type="submit"
                  disabled={!effectiveActiveChat || !messageText.trim() || isSendingMessage}
                  className="w-full sm:w-auto shrink-0 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-sm disabled:opacity-60"
                >
                  Отправить
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>

      {isClubPanelOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-5 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Клубы внутри сервиса</h3>
                <p className="text-sm text-slate-500">После создания клуб автоматически появляется как чат группы.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsClubPanelOpen(false);
                  setInviteQuery('');
                  setInviteSuggestions([]);
                  setSelectedInviteUser(null);
                }}
                className="rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-auto pr-1 max-h-[calc(90vh-110px)]">
              <section className="rounded-2xl border border-slate-200/70 p-4 bg-slate-50/70 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Входящие приглашения в клубы</h4>
                  {!pendingClubInvites.length && (
                    <p className="text-xs text-slate-500 mt-1">Сейчас приглашений нет.</p>
                  )}

                  {!!pendingClubInvites.length && (
                    <div className="space-y-2 mt-2">
                      {pendingClubInvites.map((invite) => (
                        <div key={invite.invite_id} className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex items-center gap-2">
                            {invite.club_avatar_url ? (
                              <img src={resolveAvatarUrl(invite.club_avatar_url)} alt={invite.club_name} className="w-9 h-9 rounded-lg object-cover" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center text-xs">🏷️</div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{invite.club_name}</p>
                              <p className="text-xs text-slate-500 truncate">Пригласил: {invite.invited_by_name || invite.invited_by_email}</p>
                            </div>
                          </div>

                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              disabled={handlingClubInviteId === invite.invite_id}
                              onClick={() => handleClubInviteDecision(invite.invite_id, 'accept')}
                              className="flex-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-2 py-1.5 disabled:opacity-60 inline-flex items-center justify-center gap-1"
                            >
                              <Check size={14} /> Принять
                            </button>
                            <button
                              type="button"
                              disabled={handlingClubInviteId === invite.invite_id}
                              onClick={() => handleClubInviteDecision(invite.invite_id, 'decline')}
                              className="flex-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-2 py-1.5 disabled:opacity-60 inline-flex items-center justify-center gap-1"
                            >
                              <CircleX size={14} /> Отклонить
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200/70">
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Создать новый клуб</h4>
                  <form onSubmit={createClubInsideService} className="space-y-2">
                    <input
                      value={newClubForm.name}
                      onChange={(event) => setNewClubForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Название клуба"
                      required
                    />

                    <textarea
                      rows="3"
                      value={newClubForm.description}
                      onChange={(event) => setNewClubForm((prev) => ({ ...prev, description: event.target.value }))}
                      className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Описание клуба"
                    />

                    <label className="block">
                      <span className="text-xs text-slate-500">Аватар клуба (файл)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={onNewClubAvatarChange}
                        className="mt-1 w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>

                    {newClubAvatarPreview && (
                      <img src={newClubAvatarPreview} alt="Превью" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                    )}

                    <div className="flex gap-2">
                      <input
                        value={newClubTagDraft}
                        onChange={(event) => setNewClubTagDraft(event.target.value)}
                        onKeyDown={onNewClubTagKeyDown}
                        className="flex-1 rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Тег"
                      />
                      <button
                        type="button"
                        onClick={addNewClubTag}
                        className="rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2"
                      >
                        +
                      </button>
                    </div>

                    {!!newClubForm.tags.length && (
                      <div className="flex flex-wrap gap-1.5">
                        {newClubForm.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => removeNewClubTag(tag)}
                            className="rounded-full bg-emerald-500/20 border border-emerald-300/50 px-2 py-0.5 text-xs text-emerald-700"
                          >
                            #{tag} ×
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isCreatingClub}
                      className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-2 text-sm font-medium hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-60"
                    >
                      {isCreatingClub ? 'Создаем...' : 'Создать клуб'}
                    </button>
                  </form>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200/70 p-4 bg-slate-50/70 space-y-3">
                <div className="flex items-center gap-2">
                  <Users size={17} className="text-emerald-600" />
                  <h4 className="text-sm font-semibold text-slate-900">Управление клубами</h4>
                </div>

                {!clubs.length && (
                  <p className="text-sm text-slate-500">У вас пока нет клубов для управления.</p>
                )}

                {!!clubs.length && (
                  <div className="space-y-2">
                    <div className="max-h-36 overflow-auto pr-1 space-y-1.5">
                      {clubs.map((club) => (
                        <button
                          type="button"
                          key={`manage-club-${club.id}`}
                          onClick={() => {
                            setManagedClubId(club.id);
                            setInviteQuery('');
                            setInviteSuggestions([]);
                            setSelectedInviteUser(null);
                          }}
                          className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                            managedClubId === club.id
                              ? 'bg-emerald-500/15 border-emerald-300/60 text-emerald-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-sm font-medium block truncate">{club.name}</span>
                          <span className="text-xs opacity-70">Участников: {club.member_count}</span>
                        </button>
                      ))}
                    </div>

                    {managedClubDetail && (
                      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          {managedClubDetail.avatar_url ? (
                            <img src={resolveAvatarUrl(managedClubDetail.avatar_url)} alt={managedClubDetail.name} className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-xs">🏷️</div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{managedClubDetail.name}</p>
                            <p className="text-xs text-slate-500">Участников: {managedClubDetail.member_count}</p>
                          </div>
                        </div>

                        {managedClubDetail.description && (
                          <p className="text-xs text-slate-600">{managedClubDetail.description}</p>
                        )}

                        {managedClubDetail.is_owner && (
                          <div className="space-y-2 pt-2 border-t border-slate-200">
                            <h5 className="text-xs font-semibold text-slate-700 inline-flex items-center gap-1">
                              <UserPlus size={14} /> Пригласить по имени
                            </h5>

                            <input
                              value={inviteQuery}
                              onChange={(event) => {
                                setInviteQuery(event.target.value);
                                setSelectedInviteUser(null);
                              }}
                              className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="Введите имя или email"
                            />

                            {isSearchingInviteUsers && (
                              <p className="text-xs text-slate-500">Ищем пользователей...</p>
                            )}

                            {!!visibleInviteSuggestions.length && (
                              <div className="rounded-xl border border-slate-200 bg-white max-h-40 overflow-auto">
                                {visibleInviteSuggestions.map((candidate) => (
                                  <button
                                    type="button"
                                    key={`invite-suggest-${candidate.user_id}`}
                                    onClick={() => {
                                      setSelectedInviteUser(candidate);
                                      setInviteQuery(candidate.full_name || candidate.email);
                                      setInviteSuggestions([]);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                                  >
                                    <span className="text-sm font-medium text-slate-900 block truncate">
                                      {candidate.full_name || candidate.email}
                                    </span>
                                    <span className="text-xs text-slate-500 truncate block">{candidate.email}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {selectedInviteUser && (
                              <p className="text-xs text-emerald-700 bg-emerald-500/10 border border-emerald-300/40 rounded-lg px-2 py-1">
                                Выбран пользователь: {selectedInviteUser.full_name || selectedInviteUser.email}
                              </p>
                            )}

                            <button
                              type="button"
                              disabled={!selectedInviteUser || isSendingClubInvite}
                              onClick={sendInviteToSelectedUser}
                              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-3 py-2 disabled:opacity-60"
                            >
                              {isSendingClubInvite ? 'Отправляем...' : 'Пригласить в клуб'}
                            </button>

                            {!!managedClubDetail.pending_invites?.length && (
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Ожидают подтверждения</p>
                                <div className="space-y-1">
                                  {managedClubDetail.pending_invites.map((invite) => (
                                    <div key={`pending-${invite.id}`} className="text-xs rounded-lg bg-slate-100 px-2 py-1 text-slate-700">
                                      {invite.invited_user_name || invite.invited_user_email}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {!managedClubDetail.is_owner && (
                          <p className="text-xs text-slate-500 pt-2 border-t border-slate-200">
                            Приглашать участников может только владелец клуба.
                          </p>
                        )}

                        <div className="pt-2 border-t border-slate-200">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Участники</p>
                          <div className="space-y-1 max-h-32 overflow-auto pr-1">
                            {(managedClubDetail.members || []).map((member) => (
                              <div key={`club-member-${member.user_id}`} className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs text-slate-700 flex items-center justify-between gap-2">
                                <span className="truncate">{member.full_name || member.email}</span>
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px]">
                                  {member.role === 'owner' ? 'Владелец' : 'Участник'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

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
                    <img src={resolveAvatarUrl(miniProfile.avatar_url)} alt={miniProfile.full_name} className="w-14 h-14 rounded-xl object-cover" />
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
