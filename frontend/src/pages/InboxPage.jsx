import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, CircleX, ExternalLink, MessageCircle, Settings, UserPlus, Users } from 'lucide-react';
import api from '../api/axios';

const resolveUrl = (url) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `http://localhost:8000${url}`;
};

const TABS = [
  { id: 'personal', label: 'Личные' },
  { id: 'clubs',    label: 'Клубные' },
];

const EMPTY_CLUB_FORM = { name: '', description: '', tags: [], tagDraft: '' };

const InboxPage = ({
  onUnauthorized,
  onOpenUserProfile,
  initialChatUserId,
  onInitialChatHandled,
}) => {
  const [tab, setTab] = useState('personal');
  const [myProfile, setMyProfile] = useState(null);
  const [mutualMatches, setMutualMatches] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showClubPanel, setShowClubPanel] = useState(false);
  const [clubForm, setClubForm] = useState(EMPTY_CLUB_FORM);
  const [isCreatingClub, setIsCreatingClub] = useState(false);
  const [managedClubId, setManagedClubId] = useState(null);
  const [managedDetail, setManagedDetail] = useState(null);
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteSuggestions, setInviteSuggestions] = useState([]);
  const [selectedInviteUser, setSelectedInviteUser] = useState(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [handlingInviteId, setHandlingInviteId] = useState(null);
  const [newClubAvatarFile, setNewClubAvatarFile] = useState(null);
  const [newClubAvatarPreview, setNewClubAvatarPreview] = useState('');

  const [miniProfile, setMiniProfile] = useState(null);
  const [showMini, setShowMini] = useState(false);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [profRes, mutualRes, clubsRes, invRes] = await Promise.all([
        api.get('/profiles/me'),
        api.get('/matches/mutual'),
        api.get('/clubs/'),
        api.get('/clubs/invites/me'),
      ]);
      setMyProfile(profRes.data);
      setMutualMatches(mutualRes.data?.mutual_matches || []);
      const clubList = clubsRes.data || [];
      setClubs(clubList);
      setPendingInvites(invRes.data || []);
      if (!managedClubId && clubList.length) setManagedClubId(clubList[0].id);
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось загрузить чаты.');
    } finally {
      setIsLoading(false);
    }
  }, [onUnauthorized, managedClubId]);

  useEffect(() => { loadAll(); }, []);

  // Load messages when activeChat changes
  useEffect(() => {
    const load = async () => {
      if (!activeChat) { setMessages([]); return; }
      try {
        const url = activeChat.type === 'club'
          ? `/messages/clubs/${activeChat.id}`
          : `/messages/${activeChat.id}`;
        const res = await api.get(url);
        setMessages(res.data || []);
      } catch (e) {
        if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      }
    };
    load();
  }, [activeChat, onUnauthorized]);

  // Handle initialChatUserId
  useEffect(() => {
    if (!initialChatUserId || isLoading) return;
    const canOpen = mutualMatches.some((m) => m.user_id === initialChatUserId);
    if (canOpen) {
      setActiveChat({ type: 'user', id: initialChatUserId });
      setTab('personal');
    } else {
      setError('Чат доступен только после взаимного мэтча.');
    }
    onInitialChatHandled?.();
  }, [initialChatUserId, isLoading, mutualMatches, onInitialChatHandled]);

  // Search club invite users
  useEffect(() => {
    if (!showClubPanel || !managedClubId || selectedInviteUser || inviteQuery.trim().length < 2) return;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/clubs/users/search', { params: { q: inviteQuery.trim(), club_id: managedClubId } });
        setInviteSuggestions(res.data || []);
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(timer);
  }, [inviteQuery, showClubPanel, managedClubId, selectedInviteUser]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!activeChat || !msgText.trim() || isSending) return;
    setIsSending(true);
    try {
      if (activeChat.type === 'club') {
        await api.post(`/messages/clubs/${activeChat.id}`, { content: msgText });
      } else {
        await api.post('/messages/', { receiver_id: activeChat.id, content: msgText });
      }
      setMsgText('');
      const url = activeChat.type === 'club'
        ? `/messages/clubs/${activeChat.id}`
        : `/messages/${activeChat.id}`;
      const res = await api.get(url);
      setMessages(res.data || []);
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError('Не удалось отправить сообщение.');
    } finally {
      setIsSending(false);
    }
  };

  const loadManagedDetail = useCallback(async (clubId) => {
    if (!clubId) { setManagedDetail(null); return; }
    try {
      const res = await api.get(`/clubs/${clubId}`);
      setManagedDetail(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (showClubPanel && managedClubId) loadManagedDetail(managedClubId);
  }, [showClubPanel, managedClubId, loadManagedDetail]);

  const openMini = async (userId) => {
    try {
      const res = await api.get(`/profiles/user/${userId}`);
      setMiniProfile(res.data);
      setShowMini(true);
    } catch { /* ignore */ }
  };

  const createClub = async (e) => {
    e.preventDefault();
    if (!clubForm.name.trim()) return;
    setIsCreatingClub(true);
    try {
      const fd = new FormData();
      fd.append('name', clubForm.name.trim());
      if (clubForm.description.trim()) fd.append('description', clubForm.description.trim());
      fd.append('tags_json', JSON.stringify(clubForm.tags));
      if (newClubAvatarFile) fd.append('avatar_file', newClubAvatarFile);
      const res = await api.post('/clubs/', fd);
      setClubForm(EMPTY_CLUB_FORM);
      setNewClubAvatarFile(null);
      setNewClubAvatarPreview('');
      setSuccess('Клуб создан.');
      await loadAll();
      setManagedClubId(res.data.id);
      setActiveChat({ type: 'club', id: res.data.id });
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось создать клуб.');
    } finally {
      setIsCreatingClub(false);
    }
  };

  const handleInviteDecision = async (inviteId, action) => {
    setHandlingInviteId(inviteId);
    try {
      const res = await api.post(`/clubs/invites/${inviteId}/${action}`);
      await loadAll();
      if (action === 'accept') {
        setActiveChat({ type: 'club', id: res.data.id });
        setTab('clubs');
        setSuccess('Вы вступили в клуб.');
      } else {
        setSuccess('Приглашение отклонено.');
      }
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Ошибка при обработке приглашения.');
    } finally {
      setHandlingInviteId(null);
    }
  };

  const sendInvite = async () => {
    if (!managedClubId || !selectedInviteUser) return;
    setIsSendingInvite(true);
    try {
      await api.post(`/clubs/${managedClubId}/invite`, { user_id: selectedInviteUser.user_id });
      setSuccess('Приглашение отправлено.');
      setInviteQuery('');
      setInviteSuggestions([]);
      setSelectedInviteUser(null);
      await loadManagedDetail(managedClubId);
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось отправить приглашение.');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const selectedPersonal = useMemo(
    () => mutualMatches.find((m) => m.user_id === activeChat?.id) || null,
    [mutualMatches, activeChat]
  );
  const selectedClub = useMemo(
    () => clubs.find((c) => c.id === activeChat?.id) || null,
    [clubs, activeChat]
  );
  const isClubChat = activeChat?.type === 'club';

  if (isLoading) {
    return (
      <div className="hub-shell-inline backdrop-blur-xl bg-white/50 rounded-3xl border border-white/70 p-8 text-slate-700">
        <span className="spin" /> Загружаем чаты...
      </div>
    );
  }

  return (
    <div className="hub-shell-inline space-y-4">
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-300/50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-300/50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left sidebar */}
        <div className="lg:col-span-4 backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-4 space-y-3">
          {/* Tabs */}
          <div className="flex gap-1 rounded-xl bg-slate-100/70 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition ${
                  tab === t.id
                    ? 'bg-white shadow text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
                {t.id === 'clubs' && pendingInvites.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px]">
                    {pendingInvites.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Personal chats list */}
          {tab === 'personal' && (
            <div className="space-y-1.5">
              {!mutualMatches.length && (
                <p className="text-xs text-slate-500 px-1">Личные чаты появятся после взаимных мэтчей.</p>
              )}
              {mutualMatches.map((m) => (
                <div
                  key={m.user_id}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 border transition ${
                    activeChat?.type === 'user' && activeChat.id === m.user_id
                      ? 'bg-indigo-500/15 border-indigo-300/60'
                      : 'bg-white/70 border-slate-200/60 hover:bg-white'
                  }`}
                >
                  <button type="button" onClick={() => openMini(m.user_id)} className="shrink-0">
                    {m.avatar_url ? (
                      <img src={resolveUrl(m.avatar_url)} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm">👤</div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChat({ type: 'user', id: m.user_id })}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="text-sm font-medium text-slate-900 truncate">{m.name}</p>
                    <p className="text-[11px] text-slate-500">Личный диалог</p>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Club chats list */}
          {tab === 'clubs' && (
            <div className="space-y-2">
              {/* Pending invites */}
              {pendingInvites.map((inv) => (
                <div key={inv.invite_id} className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {inv.club_avatar_url ? (
                      <img src={resolveUrl(inv.club_avatar_url)} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-xs">🏷️</div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inv.club_name}</p>
                      <p className="text-[11px] text-slate-500">от {inv.invited_by_name || inv.invited_by_email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={handlingInviteId === inv.invite_id}
                      onClick={() => handleInviteDecision(inv.invite_id, 'accept')}
                      className="flex-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs py-1.5 disabled:opacity-60 flex items-center justify-center gap-1"
                    >
                      <Check size={12} /> Принять
                    </button>
                    <button
                      type="button"
                      disabled={handlingInviteId === inv.invite_id}
                      onClick={() => handleInviteDecision(inv.invite_id, 'decline')}
                      className="flex-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs py-1.5 disabled:opacity-60 flex items-center justify-center gap-1"
                    >
                      <CircleX size={12} /> Отклонить
                    </button>
                  </div>
                </div>
              ))}

              {!clubs.length && !pendingInvites.length && (
                <p className="text-xs text-slate-500 px-1">Создайте клуб через настройки ниже.</p>
              )}

              {clubs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveChat({ type: 'club', id: c.id })}
                  className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 border transition text-left ${
                    activeChat?.type === 'club' && activeChat.id === c.id
                      ? 'bg-emerald-500/15 border-emerald-300/60'
                      : 'bg-white/70 border-slate-200/60 hover:bg-white'
                  }`}
                >
                  {c.avatar_url ? (
                    <img src={resolveUrl(c.avatar_url)} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center text-xs shrink-0">🏷️</div>
                  )}
                  <span className="min-w-0">
                    <span className="text-sm font-medium block truncate">{c.name}</span>
                    <span className="text-[11px] text-slate-500">{c.member_count} участников</span>
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => { setShowClubPanel(true); setError(''); }}
                className="w-full rounded-xl bg-indigo-500/15 border border-indigo-300/60 text-indigo-700 text-sm px-3 py-2 flex items-center justify-center gap-1.5 hover:bg-indigo-500/25"
              >
                <Settings size={14} /> Настроить клубы
              </button>
            </div>
          )}
        </div>

        {/* Chat area */}
        <div className="lg:col-span-8 backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-4 flex flex-col min-h-96">
          {/* Header */}
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60 mb-3">
            <MessageCircle size={18} className="text-indigo-600" />
            {!activeChat && <p className="text-sm text-slate-500">Выберите чат слева.</p>}
            {activeChat?.type === 'user' && selectedPersonal && (
              <>
                {selectedPersonal.avatar_url ? (
                  <img src={resolveUrl(selectedPersonal.avatar_url)} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs">👤</div>
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-900">{selectedPersonal.name}</p>
                  <p className="text-xs text-slate-500">Личный чат</p>
                </div>
              </>
            )}
            {activeChat?.type === 'club' && selectedClub && (
              <>
                {selectedClub.avatar_url ? (
                  <img src={resolveUrl(selectedClub.avatar_url)} alt="" className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-xs">🏷️</div>
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-900">{selectedClub.name}</p>
                  <p className="text-xs text-slate-500">Групповой чат · {selectedClub.member_count} чел.</p>
                </div>
              </>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto space-y-2 pr-1 min-h-64">
            {!activeChat && <p className="text-sm text-slate-400">Выберите чат для переписки.</p>}
            {activeChat && !messages.length && <p className="text-sm text-slate-400">Сообщений пока нет.</p>}
            {messages.map((msg) => {
              const isIncoming = msg.sender_id !== myProfile?.user_id;
              return (
                <div key={msg.id} className={`flex gap-2 items-end ${isIncoming ? 'justify-start' : 'justify-end'}`}>
                  {isIncoming && (
                    <button
                      type="button"
                      onClick={() => openMini(msg.sender_id)}
                      className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[11px] shrink-0"
                    >
                      {msg.sender_avatar_url ? (
                        <img src={resolveUrl(msg.sender_avatar_url)} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : '👤'}
                    </button>
                  )}
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                    isIncoming
                      ? 'bg-white border border-slate-200/70 text-slate-800'
                      : 'bg-emerald-500/20 border border-emerald-300/60 text-emerald-900'
                  }`}>
                    {isClubChat && isIncoming && (
                      <p className="text-[10px] text-slate-400 mb-0.5">
                        {msg.sender_name || `#${msg.sender_id}`}
                      </p>
                    )}
                    <span className="break-words">{msg.content}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="mt-3 flex gap-2">
            <input
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              disabled={!activeChat || isSending}
              className="flex-1 rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              placeholder={isClubChat ? 'Сообщение в клуб...' : 'Написать сообщение...'}
            />
            <button
              type="submit"
              disabled={!activeChat || !msgText.trim() || isSending}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-sm disabled:opacity-60"
            >
              {isSending ? '...' : 'Отправить'}
            </button>
          </form>
        </div>
      </div>

      {/* Club panel modal */}
      {showClubPanel && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-5 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Клубы</h3>
                <p className="text-xs text-slate-500">Создавайте клубы и приглашайте участников.</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowClubPanel(false); setInviteQuery(''); setInviteSuggestions([]); setSelectedInviteUser(null); }}
                className="rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1 text-slate-700"
              >✕</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Create club */}
              <section className="rounded-2xl border border-slate-200/70 p-4 bg-slate-50/70 space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">Создать клуб</h4>
                <form onSubmit={createClub} className="space-y-2">
                  <input
                    required
                    value={clubForm.name}
                    onChange={(e) => setClubForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Название *"
                  />
                  <textarea
                    rows={2}
                    value={clubForm.description}
                    onChange={(e) => setClubForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm focus:outline-none"
                    placeholder="Описание"
                  />
                  <label className="block">
                    <span className="text-xs text-slate-500">Аватар (файл)</span>
                    <input
                      type="file" accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        if (newClubAvatarPreview?.startsWith('blob:')) URL.revokeObjectURL(newClubAvatarPreview);
                        setNewClubAvatarFile(f);
                        setNewClubAvatarPreview(f ? URL.createObjectURL(f) : '');
                      }}
                      className="mt-1 w-full rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-sm"
                    />
                  </label>
                  {newClubAvatarPreview && <img src={newClubAvatarPreview} alt="" className="w-14 h-14 rounded-xl object-cover border border-slate-200" />}
                  <div className="flex gap-2">
                    <input
                      value={clubForm.tagDraft}
                      onChange={(e) => setClubForm((p) => ({ ...p, tagDraft: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const t = clubForm.tagDraft.trim().toLowerCase();
                          if (t && !clubForm.tags.includes(t)) setClubForm((p) => ({ ...p, tags: [...p.tags, t].slice(0, 15), tagDraft: '' }));
                          else setClubForm((p) => ({ ...p, tagDraft: '' }));
                        }
                      }}
                      className="flex-1 rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm focus:outline-none"
                      placeholder="Тег (Enter)"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const t = clubForm.tagDraft.trim().toLowerCase();
                        if (t && !clubForm.tags.includes(t)) setClubForm((p) => ({ ...p, tags: [...p.tags, t].slice(0, 15), tagDraft: '' }));
                      }}
                      className="rounded-xl bg-slate-200 hover:bg-slate-300 px-3"
                    >+</button>
                  </div>
                  {clubForm.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {clubForm.tags.map((t) => (
                        <button
                          key={t} type="button"
                          onClick={() => setClubForm((p) => ({ ...p, tags: p.tags.filter((x) => x !== t) }))}
                          className="rounded-full bg-emerald-500/20 border border-emerald-300/50 px-2 py-0.5 text-xs text-emerald-700"
                        >#{t} ×</button>
                      ))}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={isCreatingClub}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-2 text-sm font-medium disabled:opacity-60"
                  >
                    {isCreatingClub ? 'Создаём...' : 'Создать'}
                  </button>
                </form>
              </section>

              {/* Manage club */}
              <section className="rounded-2xl border border-slate-200/70 p-4 bg-slate-50/70 space-y-3">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-emerald-600" />
                  <h4 className="text-sm font-semibold text-slate-900">Управление</h4>
                </div>
                {!clubs.length ? (
                  <p className="text-xs text-slate-500">Клубов пока нет.</p>
                ) : (
                  <>
                    <div className="space-y-1.5 max-h-32 overflow-auto pr-1">
                      {clubs.map((c) => (
                        <button
                          key={c.id} type="button"
                          onClick={() => { setManagedClubId(c.id); setInviteQuery(''); setSelectedInviteUser(null); }}
                          className={`w-full rounded-xl border px-3 py-2 text-left transition text-sm ${
                            managedClubId === c.id
                              ? 'bg-emerald-500/15 border-emerald-300/60 text-emerald-900 font-medium'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {c.name} · {c.member_count} чел.
                        </button>
                      ))}
                    </div>

                    {managedDetail && managedDetail.is_owner && (
                      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                        <h5 className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <UserPlus size={13} /> Пригласить участника
                        </h5>
                        <input
                          value={inviteQuery}
                          onChange={(e) => { setInviteQuery(e.target.value); setSelectedInviteUser(null); }}
                          className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="Имя или email"
                        />
                        {inviteSuggestions.length > 0 && !selectedInviteUser && (
                          <div className="rounded-xl border border-slate-200 bg-white max-h-36 overflow-auto">
                            {inviteSuggestions.map((u) => (
                              <button
                                key={u.user_id} type="button"
                                onClick={() => { setSelectedInviteUser(u); setInviteQuery(u.full_name || u.email); setInviteSuggestions([]); }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                              >
                                <span className="text-sm font-medium text-slate-900 block">{u.full_name || u.email}</span>
                                <span className="text-xs text-slate-500">{u.email}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {selectedInviteUser && (
                          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                            Выбран: {selectedInviteUser.full_name || selectedInviteUser.email}
                          </p>
                        )}
                        <button
                          type="button"
                          disabled={!selectedInviteUser || isSendingInvite}
                          onClick={sendInvite}
                          className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm py-2 disabled:opacity-60"
                        >
                          {isSendingInvite ? 'Отправляем...' : 'Пригласить'}
                        </button>
                      </div>
                    )}

                    {managedDetail && (
                      <div className="space-y-1 max-h-36 overflow-auto pr-1">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">Участники</p>
                        {(managedDetail.members || []).map((m) => (
                          <div key={m.user_id} className="flex items-center justify-between rounded-lg bg-slate-100 px-2 py-1.5 text-xs text-slate-700">
                            <span className="truncate">{m.full_name || m.email}</span>
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] shrink-0">
                              {m.role === 'owner' ? 'Владелец' : 'Участник'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Mini profile modal */}
      {showMini && miniProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 shadow-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-900">Профиль</h3>
              <button type="button" onClick={() => setShowMini(false)} className="rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1">✕</button>
            </div>
            <div className="flex items-center gap-3 mb-3">
              {miniProfile.avatar_url ? (
                <img src={resolveUrl(miniProfile.avatar_url)} alt="" className="w-14 h-14 rounded-xl object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-100 to-cyan-100 flex items-center justify-center text-2xl">👤</div>
              )}
              <div>
                <p className="font-semibold text-slate-900">{miniProfile.full_name}</p>
                <p className="text-sm text-slate-500">{miniProfile.age} лет</p>
              </div>
            </div>
            {miniProfile.bio && <p className="text-sm text-slate-600 mb-2 line-clamp-2">{miniProfile.bio}</p>}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(miniProfile.interests || []).slice(0, 5).map((i) => (
                <span key={i} className="rounded-full bg-emerald-500/20 border border-emerald-300/50 px-2 py-0.5 text-xs text-emerald-700">{i}</span>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setActiveChat({ type: 'user', id: miniProfile.user_id }); setShowMini(false); }}
                className="flex-1 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm py-2"
              >
                Написать
              </button>
              <button
                type="button"
                onClick={() => { onOpenUserProfile?.(miniProfile.user_id); setShowMini(false); }}
                className="flex-1 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm py-2 flex items-center justify-center gap-1"
              >
                <ExternalLink size={13} /> Профиль
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxPage;
