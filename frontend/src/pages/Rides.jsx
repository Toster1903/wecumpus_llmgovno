import { useEffect, useState } from 'react';
import api from '../api/axios';

const fmt = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const EMPTY_FORM = { from_location: '', to_location: '', departure_time: '', seats_total: 1, comment: '' };

const Rides = ({ onUnauthorized }) => {
  const [rides, setRides] = useState([]);
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
      const [ridesRes, meRes] = await Promise.all([
        api.get('/rides/'),
        api.get('/users/me'),
      ]);
      setRides(ridesRes.data || []);
      setMyUserId(meRes.data?.id);
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось загрузить поездки.');
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
        from_location: form.from_location,
        to_location: form.to_location,
        departure_time: new Date(form.departure_time).toISOString(),
        seats_total: Number(form.seats_total),
        comment: form.comment || null,
      };
      await api.post('/rides/', payload);
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось создать поездку.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleJoin = async (rideId) => {
    try {
      const res = await api.post(`/rides/${rideId}/join`);
      setRides((prev) => prev.map((r) => (r.id === rideId ? res.data : r)));
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось присоединиться.');
    }
  };

  const handleLeave = async (rideId) => {
    try {
      const res = await api.post(`/rides/${rideId}/leave`);
      setRides((prev) => prev.map((r) => (r.id === rideId ? res.data : r)));
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось выйти из поездки.');
    }
  };

  const handleDelete = async (rideId) => {
    try {
      await api.delete(`/rides/${rideId}`);
      setRides((prev) => prev.filter((r) => r.id !== rideId));
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось удалить поездку.');
    }
  };

  return (
    <div className="elegant-shell">
      <div className="elegant-content" style={{ maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <div className="label-mono" style={{ marginBottom: '0.3rem' }}>Campus</div>
            <h1 className="elegant-title">Попутки</h1>
          </div>
          <button type="button" className="btn-elegant" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Отмена' : '+ Предложить поездку'}
          </button>
        </div>

        {error && <div className="elegant-msg-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {showForm && (
          <div className="elegant-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', marginBottom: '1rem' }}>Новая поездка</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <input
                  className="elegant-input" required placeholder="Откуда *"
                  value={form.from_location} onChange={(e) => setForm((p) => ({ ...p, from_location: e.target.value }))}
                />
                <input
                  className="elegant-input" required placeholder="Куда *"
                  value={form.to_location} onChange={(e) => setForm((p) => ({ ...p, to_location: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label className="elegant-field-label">Время отправления *</label>
                  <input
                    type="datetime-local" className="elegant-input" required
                    value={form.departure_time} onChange={(e) => setForm((p) => ({ ...p, departure_time: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="elegant-field-label">Мест (не считая водителя)</label>
                  <input
                    type="number" min="1" max="10" className="elegant-input"
                    value={form.seats_total} onChange={(e) => setForm((p) => ({ ...p, seats_total: e.target.value }))}
                  />
                </div>
              </div>
              <input
                className="elegant-input" placeholder="Комментарий (цена, маршрут...)"
                value={form.comment} onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-elegant" disabled={isSaving}>
                  {isSaving ? 'Создаём...' : 'Создать поездку'}
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="elegant-card"><span className="spin" /> Загружаем поездки...</div>
        ) : rides.length === 0 ? (
          <div className="elegant-card" style={{ textAlign: 'center', color: 'var(--elegant-text-muted)', padding: '3rem 1rem' }}>
            Пока нет поездок. Предложите первую!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {rides.map((r) => {
              const seatsLeft = r.seats_total - r.seats_taken;
              const isMine = r.driver_id === myUserId;
              return (
                <div key={r.id} className="elegant-card" style={{ padding: '1.2rem 1.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Fraunces', serif", fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                        {r.from_location} → {r.to_location}
                      </div>
                      {r.comment && (
                        <p style={{ fontSize: '0.9rem', color: 'var(--elegant-text-muted)', margin: '0 0 0.5rem' }}>{r.comment}</p>
                      )}
                      <div style={{ display: 'flex', gap: '1.2rem', fontSize: '0.8rem', color: 'var(--elegant-text-faint)', fontFamily: "'JetBrains Mono', monospace" }}>
                        <span>🕐 {fmt(r.departure_time)}</span>
                        <span>💺 {seatsLeft} мест свободно</span>
                        <span>Водитель: {r.driver_name || 'Кто-то'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      {isMine ? (
                        <button type="button" onClick={() => handleDelete(r.id)} className="btn-elegant-ghost" style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>
                          Отменить
                        </button>
                      ) : r.is_joined ? (
                        <button type="button" onClick={() => handleLeave(r.id)} className="btn-elegant-ghost" style={{ fontSize: '0.8rem' }}>
                          Выйти
                        </button>
                      ) : seatsLeft > 0 ? (
                        <button type="button" onClick={() => handleJoin(r.id)} className="btn-elegant" style={{ fontSize: '0.8rem' }}>
                          Поехать
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--elegant-text-faint)', fontFamily: "'JetBrains Mono', monospace" }}>Мест нет</span>
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

export default Rides;
