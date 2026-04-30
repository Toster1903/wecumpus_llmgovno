import { useEffect, useState } from 'react';
import api from '../api/axios';

const fmt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const EMPTY_FORM = { title: '', description: '', location: '', start_time: '', end_time: '', tags: '' };

const Events = ({ onUnauthorized }) => {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [myUserId, setMyUserId] = useState(null);
  const [registering, setRegistering] = useState({});

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [eventsRes, meRes] = await Promise.all([
        api.get('/events/'),
        api.get('/users/me'),
      ]);
      setEvents(eventsRes.data || []);
      setMyUserId(meRes.data?.id);
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось загрузить события.');
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
        start_time: new Date(form.start_time).toISOString(),
        end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };
      await api.post('/events/', payload);
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось создать событие.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (eventId) => {
    try {
      await api.delete(`/events/${eventId}`);
      setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось удалить событие.');
    }
  };

  const handleRegister = async (ev) => {
    setRegistering((p) => ({ ...p, [ev.id]: true }));
    try {
      if (ev.is_registered) {
        await api.delete(`/events/${ev.id}/register`);
      } else {
        await api.post(`/events/${ev.id}/register`);
      }
      setEvents((prev) =>
        prev.map((e) =>
          e.id === ev.id
            ? {
                ...e,
                is_registered: !ev.is_registered,
                registrations_count: ev.registrations_count + (ev.is_registered ? -1 : 1),
              }
            : e
        )
      );
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
    } finally {
      setRegistering((p) => ({ ...p, [ev.id]: false }));
    }
  };

  return (
    <div className="elegant-shell">
      <div className="elegant-content" style={{ maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <div className="label-mono" style={{ marginBottom: '0.3rem' }}>Campus</div>
            <h1 className="elegant-title">События</h1>
          </div>
          <button type="button" className="btn-elegant" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Отмена' : '+ Создать'}
          </button>
        </div>

        {error && <div className="elegant-msg-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {showForm && (
          <div className="elegant-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', marginBottom: '1rem' }}>Новое событие</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <input
                className="elegant-input" required placeholder="Название *"
                value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
              <textarea
                className="elegant-input" rows={3} placeholder="Описание"
                value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
              <input
                className="elegant-input" placeholder="Место проведения"
                value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label className="elegant-field-label">Начало *</label>
                  <input
                    type="datetime-local" className="elegant-input" required
                    value={form.start_time} onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="elegant-field-label">Конец</label>
                  <input
                    type="datetime-local" className="elegant-input"
                    value={form.end_time} onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                  />
                </div>
              </div>
              <input
                className="elegant-input" placeholder="Теги через запятую (AI, кино, спорт)"
                value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-elegant" disabled={isSaving}>
                  {isSaving ? 'Создаём...' : 'Создать событие'}
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="elegant-card"><span className="spin" /> Загружаем события...</div>
        ) : events.length === 0 ? (
          <div className="elegant-card" style={{ textAlign: 'center', color: 'var(--elegant-text-muted)', padding: '3rem 1rem' }}>
            Пока нет событий. Создайте первое!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {events.map((ev) => (
              <div key={ev.id} className="elegant-card" style={{ padding: '1.2rem 1.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: "'Fraunces', serif", fontSize: '1.05rem', fontWeight: 600, color: 'var(--elegant-text)' }}>
                        {ev.title}
                      </span>
                      {(ev.tags || []).map((tag) => (
                        <span key={tag} className="elegant-chip" style={{ fontSize: '0.65rem' }}>{tag}</span>
                      ))}
                    </div>
                    {ev.description && (
                      <p style={{ fontSize: '0.9rem', color: 'var(--elegant-text-muted)', margin: '0 0 0.5rem' }}>{ev.description}</p>
                    )}
                    <div style={{ display: 'flex', gap: '1.2rem', fontSize: '0.8rem', color: 'var(--elegant-text-faint)', fontFamily: "'JetBrains Mono', monospace", flexWrap: 'wrap' }}>
                      {ev.location && <span>📍 {ev.location}</span>}
                      <span>🕐 {fmt(ev.start_time)}{ev.end_time ? ` — ${fmt(ev.end_time)}` : ''}</span>
                      <span>👤 {ev.creator_name || 'Кто-то'}</span>
                      {ev.registrations_count > 0 && (
                        <span>✅ {ev.registrations_count} запис{ev.registrations_count === 1 ? 'ь' : ev.registrations_count < 5 ? 'и' : 'ей'}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                    <button
                      type="button"
                      className={ev.is_registered ? 'btn-elegant' : 'btn-elegant-ghost'}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem', whiteSpace: 'nowrap' }}
                      disabled={registering[ev.id]}
                      onClick={() => handleRegister(ev)}
                    >
                      {registering[ev.id] ? '...' : ev.is_registered ? '✓ Записан' : 'Записаться'}
                    </button>
                    {ev.creator_id === myUserId && (
                      <button
                        type="button" onClick={() => handleDelete(ev.id)}
                        className="btn-elegant-ghost"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', color: 'var(--elegant-text-muted)' }}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;
