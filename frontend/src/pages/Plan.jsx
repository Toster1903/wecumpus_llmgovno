import { useEffect, useState } from 'react';
import api from '../api/axios';

const fmt = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const EMPTY_FORM = { title: '', description: '', location: '', scheduled_at: '' };

const Plan = ({ onUnauthorized }) => {
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [myUserId, setMyUserId] = useState(null);

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [meetingsRes, meRes] = await Promise.all([
        api.get('/plan/'),
        api.get('/users/me'),
      ]);
      setMeetings(meetingsRes.data || []);
      setMyUserId(meRes.data?.id);
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось загрузить встречи.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        location: form.location || null,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
      };
      await api.post('/plan/', payload);
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось создать встречу.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleJoin = async (meetingId) => {
    try {
      const res = await api.post(`/plan/${meetingId}/join`);
      setMeetings((prev) => prev.map((m) => (m.id === meetingId ? res.data : m)));
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось присоединиться.');
    }
  };

  const handleLeave = async (meetingId) => {
    try {
      const res = await api.post(`/plan/${meetingId}/leave`);
      setMeetings((prev) => prev.map((m) => (m.id === meetingId ? res.data : m)));
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось выйти из встречи.');
    }
  };

  const handleDelete = async (meetingId) => {
    try {
      await api.delete(`/plan/${meetingId}`);
      setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось удалить встречу.');
    }
  };

  return (
    <div className="elegant-shell">
      <div className="elegant-content" style={{ maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <div className="label-mono" style={{ marginBottom: '0.3rem' }}>Campus</div>
            <h1 className="elegant-title">Встречи</h1>
          </div>
          <button type="button" className="btn-elegant" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Отмена' : '+ Создать встречу'}
          </button>
        </div>

        {error && <div className="elegant-msg-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {showForm && (
          <div className="elegant-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', marginBottom: '1rem' }}>Новая встреча</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <input
                className="elegant-input" required placeholder="Название встречи *"
                value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
              <textarea
                className="elegant-input" rows={3} placeholder="Описание / повестка"
                value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <input
                  className="elegant-input" placeholder="Место"
                  value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                />
                <div>
                  <label className="elegant-field-label">Когда *</label>
                  <input
                    type="datetime-local" className="elegant-input" required
                    value={form.scheduled_at} onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-elegant" disabled={isSaving}>
                  {isSaving ? 'Создаём...' : 'Создать встречу'}
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="elegant-card"><span className="spin" /> Загружаем встречи...</div>
        ) : meetings.length === 0 ? (
          <div className="elegant-card" style={{ textAlign: 'center', color: 'var(--elegant-text-muted)', padding: '3rem 1rem' }}>
            Встреч пока нет. Создайте первую!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {meetings.map((m) => {
              const isMine = m.creator_id === myUserId;
              return (
                <div key={m.id} className="elegant-card" style={{ padding: '1.2rem 1.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Fraunces', serif", fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                        {m.title}
                      </div>
                      {m.description && (
                        <p style={{ fontSize: '0.9rem', color: 'var(--elegant-text-muted)', margin: '0 0 0.5rem' }}>{m.description}</p>
                      )}
                      <div style={{ display: 'flex', gap: '1.2rem', fontSize: '0.8rem', color: 'var(--elegant-text-faint)', fontFamily: "'JetBrains Mono', monospace" }}>
                        <span>🕐 {fmt(m.scheduled_at)}</span>
                        {m.location && <span>📍 {m.location}</span>}
                        <span>👥 {m.participant_count} участников</span>
                        <span>Организатор: {m.creator_name || 'Кто-то'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      {isMine ? (
                        <button type="button" onClick={() => handleDelete(m.id)} className="btn-elegant-ghost" style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>
                          Удалить
                        </button>
                      ) : m.is_joined ? (
                        <button type="button" onClick={() => handleLeave(m.id)} className="btn-elegant-ghost" style={{ fontSize: '0.8rem' }}>
                          Не пойду
                        </button>
                      ) : (
                        <button type="button" onClick={() => handleJoin(m.id)} className="btn-elegant" style={{ fontSize: '0.8rem' }}>
                          Пойду
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Plan;
