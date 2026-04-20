import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';

const Chat = ({ onUnauthorized }) => {
  const [mutualMatches, setMutualMatches] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchMutualMatches = useCallback(async () => {
    const response = await api.get('/matches/mutual');
    const items = response.data?.mutual_matches || [];
    setMutualMatches(items);
    if (items.length && !selectedUserId) {
      setSelectedUserId(items[0].user_id);
    }
  }, [selectedUserId]);

  const fetchConversation = useCallback(async (userId) => {
    if (!userId) {
      setMessages([]);
      return;
    }
    const response = await api.get(`/messages/${userId}`);
    setMessages(response.data || []);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        await fetchMutualMatches();
      } catch (error) {
        if (error?.response?.status === 401) {
          onUnauthorized?.();
          return;
        }
        setErrorMessage(error?.response?.data?.detail || 'Не удалось загрузить чаты.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [fetchMutualMatches, onUnauthorized]);

  useEffect(() => {
    const loadConversation = async () => {
      try {
        await fetchConversation(selectedUserId);
      } catch (error) {
        if (error?.response?.status === 401) {
          onUnauthorized?.();
          return;
        }
        setErrorMessage(error?.response?.data?.detail || 'Не удалось загрузить сообщения.');
      }
    };

    loadConversation();
  }, [fetchConversation, onUnauthorized, selectedUserId]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!selectedUserId || !text.trim()) {
      return;
    }

    try {
      await api.post('/messages/', {
        receiver_id: selectedUserId,
        content: text,
      });
      setText('');
      await fetchConversation(selectedUserId);
    } catch (error) {
      if (error?.response?.status === 401) {
        onUnauthorized?.();
        return;
      }
      setErrorMessage(error?.response?.data?.detail || 'Не удалось отправить сообщение.');
    }
  };

  if (isLoading) {
    return (
      <div className="backdrop-blur-xl bg-white/50 rounded-3xl border border-white/70 p-8 text-slate-700">
        Загружаем чаты...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Взаимные матчи</h2>
        {!mutualMatches.length && <p className="text-sm text-slate-500">Пока нет взаимных матчей.</p>}
        <div className="space-y-2">
          {mutualMatches.map((item) => (
            <button
              type="button"
              key={item.user_id}
              onClick={() => setSelectedUserId(item.user_id)}
              className={`w-full text-left rounded-xl px-3 py-2 border ${
                item.user_id === selectedUserId
                  ? 'bg-emerald-500/20 border-emerald-300/60 text-emerald-900'
                  : 'bg-white/60 border-slate-200/60 text-slate-700'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div className="col-span-2 backdrop-blur-xl bg-white/40 rounded-3xl border border-white/60 p-4 flex flex-col">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Чат</h2>
        {errorMessage && (
          <div className="mb-3 rounded-xl bg-red-500/10 border border-red-300/50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="flex-1 min-h-80 max-h-96 overflow-auto space-y-2 pr-1">
          {!selectedUserId && <p className="text-sm text-slate-500">Выберите пользователя для переписки.</p>}
          {selectedUserId && !messages.length && <p className="text-sm text-slate-500">Сообщений пока нет.</p>}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                message.sender_id === selectedUserId
                  ? 'bg-white/80 border border-slate-200/60 text-slate-800'
                  : 'ml-auto bg-emerald-500/20 border border-emerald-300/60 text-emerald-900'
              }`}
            >
              {message.content}
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage} className="mt-4 flex gap-2">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="flex-1 rounded-xl bg-white/70 border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Введите сообщение"
            disabled={!selectedUserId}
          />
          <button
            type="submit"
            disabled={!selectedUserId || !text.trim()}
            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-sm disabled:opacity-60"
          >
            Отправить
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
