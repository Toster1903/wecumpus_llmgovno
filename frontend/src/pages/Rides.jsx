import { useEffect, useState } from 'react';
import api from '../api/axios';
import LeafletMap from '../components/LeafletMap';

const SIRIUS = [43.4070, 39.9500];

const PRESET_ROUTES = [
  {
    label: 'Кампус → Аэропорт Сочи',
    from: 'Кампус Сириус',
    to: 'Аэропорт Сочи',
    coords: [SIRIUS, [43.4495, 39.9558]],
  },
  {
    label: 'Кампус → Адлер (ж/д)',
    from: 'Кампус Сириус',
    to: 'Адлер, ж/д вокзал',
    coords: [SIRIUS, [43.4497, 39.9192]],
  },
  {
    label: 'Кампус → ТРЦ Моремолл',
    from: 'Кампус Сириус',
    to: 'ТРЦ Моремолл',
    coords: [SIRIUS, [43.4166, 39.9394]],
  },
  {
    label: 'Кампус → Центр Сочи',
    from: 'Кампус Сириус',
    to: 'Центр Сочи',
    coords: [SIRIUS, [43.5852, 39.7203]],
  },
  {
    label: 'Кампус → Роза Хутор',
    from: 'Кампус Сириус',
    to: 'Роза Хутор',
    coords: [SIRIUS, [43.6825, 40.2785]],
  },
  {
    label: 'Кампус → Красная Поляна',
    from: 'Кампус Сириус',
    to: 'Красная Поляна',
    coords: [SIRIUS, [43.6785, 40.2070]],
  },
  {
    label: 'Кампус → Олимпийский парк',
    from: 'Кампус Сириус',
    to: 'Олимпийский парк',
    coords: [SIRIUS, [43.4018, 39.9567]],
  },
];

const fmt = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const EMPTY_FORM = {
  from_location: '',
  to_location: '',
  departure_time: '',
  seats_total: 1,
  comment: '',
};

const Rides = ({ onUnauthorized }) => {
  const [rides, setRides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [myUserId, setMyUserId] = useState(null);

  // Map state
  const [selectedRide, setSelectedRide] = useState(null); // ride for map preview
  const [mapRoute, setMapRoute] = useState([]);           // [[lat,lng],...]
  const [mapMarkers, setMapMarkers] = useState([]);
  const [mapCenter, setMapCenter] = useState(SIRIUS);

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

  // Try to geocode with Nominatim
  const geocode = async (query) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Сочи')}&format=json&limit=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'ru' } });
      const data = await res.json();
      if (data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    } catch { /* ignore */ }
    return null;
  };

  const showRideOnMap = async (ride) => {
    setSelectedRide(ride.id);
    // Try to find matching preset
    const preset = PRESET_ROUTES.find(
      (p) =>
        ride.from_location?.toLowerCase().includes(p.from.toLowerCase().split(' ')[0].toLowerCase()) ||
        ride.to_location?.toLowerCase().includes(p.to.toLowerCase().split(' ')[0].toLowerCase())
    );
    if (preset) {
      setMapRoute(preset.coords);
      setMapMarkers([
        { lat: preset.coords[0][0], lng: preset.coords[0][1], label: ride.from_location, color: '#10b981' },
        { lat: preset.coords[1][0], lng: preset.coords[1][1], label: ride.to_location, color: '#ef4444' },
      ]);
      setMapCenter(preset.coords[0]);
      return;
    }
    // Fallback: geocode
    const [fromCoords, toCoords] = await Promise.all([
      geocode(ride.from_location),
      geocode(ride.to_location),
    ]);
    if (fromCoords && toCoords) {
      setMapRoute([fromCoords, toCoords]);
      setMapMarkers([
        { lat: fromCoords[0], lng: fromCoords[1], label: ride.from_location, color: '#10b981' },
        { lat: toCoords[0], lng: toCoords[1], label: ride.to_location, color: '#ef4444' },
      ]);
      setMapCenter(fromCoords);
    } else {
      setMapRoute([]);
      setMapMarkers([{ lat: SIRIUS[0], lng: SIRIUS[1], label: 'Кампус Сириус', color: '#10b981' }]);
      setMapCenter(SIRIUS);
    }
  };

  const applyPreset = (preset) => {
    setForm((p) => ({ ...p, from_location: preset.from, to_location: preset.to }));
    setMapRoute(preset.coords);
    setMapMarkers([
      { lat: preset.coords[0][0], lng: preset.coords[0][1], label: preset.from, color: '#10b981' },
      { lat: preset.coords[1][0], lng: preset.coords[1][1], label: preset.to, color: '#ef4444' },
    ]);
    setMapCenter(preset.coords[0]);
  };

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
      setMapRoute([]);
      setMapMarkers([]);
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
      setError(e?.response?.data?.detail || 'Не удалось выйти.');
    }
  };

  const handleDelete = async (rideId) => {
    try {
      await api.delete(`/rides/${rideId}`);
      setRides((prev) => prev.filter((r) => r.id !== rideId));
      if (selectedRide === rideId) { setSelectedRide(null); setMapRoute([]); setMapMarkers([]); }
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось удалить поездку.');
    }
  };

  return (
    <div className="elegant-shell">
      <div className="elegant-content" style={{ maxWidth: 1100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <div className="label-mono" style={{ marginBottom: '0.3rem' }}>Campus</div>
            <h1 className="elegant-title">Попутки</h1>
          </div>
          <button type="button" className="btn-elegant" onClick={() => { setShowForm((v) => !v); setMapRoute([]); setMapMarkers([]); }}>
            {showForm ? 'Отмена' : '+ Предложить поездку'}
          </button>
        </div>

        {error && <div className="elegant-msg-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left: form + list */}
          <div>
            {showForm && (
              <div className="elegant-card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', marginBottom: '0.8rem' }}>Новая поездка</h3>

                {/* Preset route buttons */}
                <div style={{ marginBottom: '0.8rem' }}>
                  <div className="elegant-field-label" style={{ marginBottom: '0.4rem' }}>Готовые маршруты с кампуса</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {PRESET_ROUTES.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className={
                          form.to_location === p.to
                            ? 'btn-elegant'
                            : 'btn-elegant-ghost'
                        }
                        style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem' }}
                      >
                        {p.to}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                    <input
                      className="elegant-input" required placeholder="Откуда *"
                      value={form.from_location}
                      onChange={(e) => setForm((p) => ({ ...p, from_location: e.target.value }))}
                    />
                    <input
                      className="elegant-input" required placeholder="Куда *"
                      value={form.to_location}
                      onChange={(e) => setForm((p) => ({ ...p, to_location: e.target.value }))}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                    <div>
                      <label className="elegant-field-label">Время отправления *</label>
                      <input
                        type="datetime-local" className="elegant-input" required
                        value={form.departure_time}
                        onChange={(e) => setForm((p) => ({ ...p, departure_time: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="elegant-field-label">Мест</label>
                      <input
                        type="number" min="1" max="10" className="elegant-input"
                        value={form.seats_total}
                        onChange={(e) => setForm((p) => ({ ...p, seats_total: e.target.value }))}
                      />
                    </div>
                  </div>
                  <input
                    className="elegant-input" placeholder="Комментарий (цена, маршрут...)"
                    value={form.comment}
                    onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
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
                Поездок пока нет. Предложите первую!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {rides.map((r) => {
                  const seatsLeft = r.seats_total - r.seats_taken;
                  const isMine = r.driver_id === myUserId;
                  const isSelected = selectedRide === r.id;
                  return (
                    <div
                      key={r.id}
                      className="elegant-card"
                      style={{
                        padding: '1rem 1.2rem',
                        cursor: 'pointer',
                        outline: isSelected ? '2px solid var(--elegant-primary)' : 'none',
                        outlineOffset: '2px',
                      }}
                      onClick={() => showRideOnMap(r)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '1rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                            {r.from_location} → {r.to_location}
                          </div>
                          {r.comment && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--elegant-text-muted)', margin: '0 0 0.4rem' }}>{r.comment}</p>
                          )}
                          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--elegant-text-faint)', fontFamily: "'JetBrains Mono', monospace" }}>
                            <span>🕐 {fmt(r.departure_time)}</span>
                            <span>💺 {seatsLeft} мест</span>
                            <span>📍 {r.driver_name || 'Водитель'}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
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
                            <span style={{ fontSize: '0.78rem', color: 'var(--elegant-text-faint)' }}>Мест нет</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Map */}
          <div style={{ position: 'sticky', top: '1rem' }}>
            <div className="elegant-card" style={{ padding: '1rem' }}>
              <div className="elegant-field-label" style={{ marginBottom: '0.6rem' }}>
                {selectedRide
                  ? `Маршрут: ${rides.find((r) => r.id === selectedRide)?.from_location} → ${rides.find((r) => r.id === selectedRide)?.to_location}`
                  : 'Кликните на поездку, чтобы увидеть маршрут'}
              </div>
              <LeafletMap
                center={mapCenter}
                zoom={selectedRide ? 11 : 13}
                markers={mapMarkers.length ? mapMarkers : [{ lat: SIRIUS[0], lng: SIRIUS[1], label: 'Кампус Сириус' }]}
                route={mapRoute}
                height="400px"
              />
            </div>

            {/* Preset legend */}
            {!showForm && (
              <div className="elegant-card" style={{ padding: '1rem', marginTop: '0.75rem' }}>
                <div className="elegant-field-label" style={{ marginBottom: '0.5rem' }}>Популярные направления</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {PRESET_ROUTES.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setMapRoute(p.coords);
                        setMapMarkers([
                          { lat: p.coords[0][0], lng: p.coords[0][1], label: p.from, color: '#10b981' },
                          { lat: p.coords[1][0], lng: p.coords[1][1], label: p.to, color: '#ef4444' },
                        ]);
                        setMapCenter(p.coords[0]);
                        setSelectedRide(null);
                      }}
                      style={{
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        padding: '0.25rem 0',
                        fontSize: '0.82rem',
                        color: 'var(--elegant-text-muted)',
                        cursor: 'pointer',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                      className="hover:text-slate-800"
                    >
                      📍 {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rides;
