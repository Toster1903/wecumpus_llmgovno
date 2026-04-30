import { useEffect, useState } from 'react';
import api from '../api/axios';

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAYS_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

const fmtTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getDaysInMonth = (year, month) => {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = (first.getDay() + 6) % 7; // Mon=0
  const days = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
};

const EMPTY_FORM = { title: '', description: '', location: '', start_time: '', end_time: '', tags: '' };

const Calendar = ({ onUnauthorized }) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/events/my-registrations');
      setEvents(res.data || []);
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
    }
  };

  useEffect(() => { load(); }, []);

  const days = getDaysInMonth(year, month);

  const eventsOnDay = (day) => {
    if (!day) return [];
    return events.filter((ev) => isSameDay(new Date(ev.start_time), day));
  };

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
    setSelectedDay(null);
  };

  const handleDayClick = (day) => {
    if (!day) return;
    setSelectedDay(day);
    setShowForm(false);
  };

  const handleCreateEvent = async (e) => {
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
      const res = await api.post('/events/', payload);
      // Auto-register for own event
      await api.post(`/events/${res.data.id}/register`);
      await load();
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось создать событие.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedEvents = selectedDay ? eventsOnDay(selectedDay) : [];

  return (
    <div className="elegant-shell">
      <div className="elegant-content" style={{ maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <div className="label-mono" style={{ marginBottom: '0.3rem' }}>Campus</div>
            <h1 className="elegant-title">Мой календарь</h1>
          </div>
          <button type="button" className="btn-elegant" onClick={() => { setShowForm((v) => !v); setSelectedDay(null); }}>
            {showForm ? 'Отмена' : '+ Событие'}
          </button>
        </div>

        {showForm && (
          <div className="elegant-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', marginBottom: '1rem' }}>Личное событие</h3>
            {error && <div className="elegant-msg-error" style={{ marginBottom: '0.8rem' }}>{error}</div>}
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <input
                className="elegant-input" required placeholder="Название *"
                value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
              <input
                className="elegant-input" placeholder="Место"
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
              <textarea
                className="elegant-input" rows={2} placeholder="Описание"
                value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-elegant" disabled={isSaving}>
                  {isSaving ? 'Сохраняем...' : 'Добавить в календарь'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: selectedDay ? '1fr 320px' : '1fr', gap: '1.5rem' }}>
          {/* Calendar grid */}
          <div className="elegant-card" style={{ padding: '1.2rem' }}>
            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <button type="button" className="btn-elegant-ghost" style={{ padding: '0.3rem 0.7rem' }} onClick={prevMonth}>‹</button>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', fontWeight: 600 }}>
                {MONTHS_RU[month]} {year}
              </span>
              <button type="button" className="btn-elegant-ghost" style={{ padding: '0.3rem 0.7rem' }} onClick={nextMonth}>›</button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
              {DAYS_RU.map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--elegant-text-muted)', fontFamily: "'JetBrains Mono', monospace", padding: '4px 0' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {days.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />;
                const dayEvents = eventsOnDay(day);
                const isToday = isSameDay(day, today);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    style={{
                      minHeight: 52,
                      padding: '4px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: isSelected
                        ? 'var(--elegant-accent, #2d6a4f)'
                        : isToday
                        ? 'rgba(45,106,79,0.12)'
                        : 'transparent',
                      border: isToday && !isSelected ? '1px solid var(--elegant-accent, #2d6a4f)' : '1px solid transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      fontSize: '0.8rem',
                      fontWeight: isToday ? 700 : 400,
                      color: isSelected ? '#fff' : isToday ? 'var(--elegant-accent, #2d6a4f)' : 'var(--elegant-text)',
                      marginBottom: 2,
                    }}>
                      {day.getDate()}
                    </div>
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div key={ev.id} style={{
                        fontSize: '0.6rem',
                        background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--elegant-accent, #2d6a4f)',
                        color: '#fff',
                        borderRadius: 3,
                        padding: '1px 3px',
                        marginBottom: 1,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}>
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div style={{ fontSize: '0.55rem', color: isSelected ? '#fff' : 'var(--elegant-text-muted)' }}>
                        +{dayEvents.length - 2}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected day detail */}
          {selectedDay && (
            <div>
              <div className="elegant-card" style={{ padding: '1.2rem' }}>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: '1rem', fontWeight: 600, marginBottom: '0.8rem' }}>
                  {selectedDay.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}
                </div>
                {selectedEvents.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--elegant-text-muted)' }}>Нет событий. Добавьте через кнопку «+ Событие».</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {selectedEvents.map((ev) => (
                      <div key={ev.id} style={{ borderLeft: '3px solid var(--elegant-accent, #2d6a4f)', paddingLeft: '0.7rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--elegant-text)' }}>{ev.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--elegant-text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                          🕐 {fmtTime(ev.start_time)}{ev.end_time ? ` — ${fmtTime(ev.end_time)}` : ''}
                        </div>
                        {ev.location && <div style={{ fontSize: '0.75rem', color: 'var(--elegant-text-muted)' }}>📍 {ev.location}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* All upcoming registered events */}
        <div style={{ marginTop: '1.5rem' }}>
          <div className="label-mono" style={{ marginBottom: '0.5rem' }}>Все записи</div>
          {events.length === 0 ? (
            <div className="elegant-card" style={{ textAlign: 'center', color: 'var(--elegant-text-muted)', padding: '2rem 1rem' }}>
              Вы ещё не записаны ни на одно мероприятие. Откройте раздел «События» и нажмите «Записаться».
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[...events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time)).map((ev) => (
                <div key={ev.id} className="elegant-card" style={{ padding: '0.9rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{ev.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--elegant-text-muted)', fontFamily: "'JetBrains Mono', monospace' " }}>
                      {new Date(ev.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {ev.location ? ` · ${ev.location}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-elegant-ghost"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    onClick={() => {
                      const d = new Date(ev.start_time);
                      setYear(d.getFullYear());
                      setMonth(d.getMonth());
                      setSelectedDay(d);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    В календаре
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
