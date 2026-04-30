import { useEffect, useState } from 'react';
import api from '../api/axios';

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAYS_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

const fmtMeeting = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const EMPTY_MEETING_FORM = { title: '', description: '', location: '', scheduled_at: '' };

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
  const [activeTab, setActiveTab] = useState('calendar');

  // Calendar state
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Meetings (plan) state
  const [meetings, setMeetings] = useState([]);
  const [myUserId, setMyUserId] = useState(null);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingForm, setMeetingForm] = useState(EMPTY_MEETING_FORM);
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/events/my-registrations');
      setEvents(res.data || []);
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
    }
  };

  const loadMeetings = async () => {
    try {
      const [meetRes, meRes] = await Promise.all([api.get('/plan/'), api.get('/users/me')]);
      setMeetings(meetRes.data || []);
      setMyUserId(meRes.data?.id);
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
    }
  };

  useEffect(() => { load(); loadMeetings(); }, []);

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

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    setIsSavingMeeting(true);
    setError('');
    try {
      await api.post('/plan/', {
        title: meetingForm.title,
        description: meetingForm.description || null,
        location: meetingForm.location || null,
        scheduled_at: new Date(meetingForm.scheduled_at).toISOString(),
      });
      setMeetingForm(EMPTY_MEETING_FORM);
      setShowMeetingForm(false);
      await loadMeetings();
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось создать встречу.');
    } finally {
      setIsSavingMeeting(false);
    }
  };

  const handleJoin = async (id) => {
    try {
      const res = await api.post(`/plan/${id}/join`);
      setMeetings((prev) => prev.map((m) => (m.id === id ? res.data : m)));
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
    }
  };

  const handleLeave = async (id) => {
    try {
      const res = await api.post(`/plan/${id}/leave`);
      setMeetings((prev) => prev.map((m) => (m.id === id ? res.data : m)));
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
    }
  };

  const handleDeleteMeeting = async (id) => {
    try {
      await api.delete(`/plan/${id}`);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
    }
  };

  return (
    <div className="elegant-shell">
      <div className="elegant-content" style={{ maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div>
            <div className="label-mono" style={{ marginBottom: '0.3rem' }}>Campus</div>
            <h1 className="elegant-title">{activeTab === 'calendar' ? 'Мой календарь' : 'Встречи'}</h1>
          </div>
          {activeTab === 'calendar' ? (
            <button type="button" className="btn-elegant" onClick={() => { setShowForm((v) => !v); setSelectedDay(null); }}>
              {showForm ? 'Отмена' : '+ Событие'}
            </button>
          ) : (
            <button type="button" className="btn-elegant" onClick={() => setShowMeetingForm((v) => !v)}>
              {showMeetingForm ? 'Отмена' : '+ Создать встречу'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(0,0,0,0.05)', borderRadius: 10, padding: '3px', marginBottom: '1.2rem', width: 'fit-content' }}>
          {[{ id: 'calendar', label: 'Календарь' }, { id: 'meetings', label: 'Встречи' }].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setActiveTab(t.id); setError(''); }}
              style={{
                padding: '0.35rem 1rem',
                borderRadius: 7,
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: activeTab === t.id ? 600 : 400,
                background: activeTab === t.id ? '#fff' : 'transparent',
                boxShadow: activeTab === t.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                color: activeTab === t.id ? 'var(--elegant-text)' : 'var(--elegant-text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <div className="elegant-msg-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* ── CALENDAR TAB ── */}
        {activeTab === 'calendar' && (
          <>
            {showForm && (
              <div className="elegant-card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', marginBottom: '1rem' }}>Личное событие</h3>
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
              <div className="elegant-card" style={{ padding: '1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <button type="button" className="btn-elegant-ghost" style={{ padding: '0.3rem 0.7rem' }} onClick={prevMonth}>‹</button>
                  <span style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', fontWeight: 600 }}>
                    {MONTHS_RU[month]} {year}
                  </span>
                  <button type="button" className="btn-elegant-ghost" style={{ padding: '0.3rem 0.7rem' }} onClick={nextMonth}>›</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                  {DAYS_RU.map((d) => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--elegant-text-muted)', fontFamily: "'JetBrains Mono', monospace", padding: '4px 0' }}>
                      {d}
                    </div>
                  ))}
                </div>
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
                          minHeight: 52, padding: '4px', borderRadius: 6, cursor: 'pointer',
                          background: isSelected ? 'var(--elegant-accent, #2d6a4f)' : isToday ? 'rgba(45,106,79,0.12)' : 'transparent',
                          border: isToday && !isSelected ? '1px solid var(--elegant-accent, #2d6a4f)' : '1px solid transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        <div style={{ fontSize: '0.8rem', fontWeight: isToday ? 700 : 400, color: isSelected ? '#fff' : isToday ? 'var(--elegant-accent, #2d6a4f)' : 'var(--elegant-text)', marginBottom: 2 }}>
                          {day.getDate()}
                        </div>
                        {dayEvents.slice(0, 2).map((ev) => (
                          <div key={ev.id} style={{ fontSize: '0.6rem', background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--elegant-accent, #2d6a4f)', color: '#fff', borderRadius: 3, padding: '1px 3px', marginBottom: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div style={{ fontSize: '0.55rem', color: isSelected ? '#fff' : 'var(--elegant-text-muted)' }}>+{dayEvents.length - 2}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedDay && (
                <div className="elegant-card" style={{ padding: '1.2rem' }}>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: '1rem', fontWeight: 600, marginBottom: '0.8rem' }}>
                    {selectedDay.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}
                  </div>
                  {selectedEvents.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--elegant-text-muted)' }}>Нет событий на этот день.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {selectedEvents.map((ev) => (
                        <div key={ev.id} style={{ borderLeft: '3px solid var(--elegant-accent, #2d6a4f)', paddingLeft: '0.7rem' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ev.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--elegant-text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                            🕐 {fmtTime(ev.start_time)}{ev.end_time ? ` — ${fmtTime(ev.end_time)}` : ''}
                          </div>
                          {ev.location && <div style={{ fontSize: '0.75rem', color: 'var(--elegant-text-muted)' }}>📍 {ev.location}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

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
                        <div style={{ fontSize: '0.75rem', color: 'var(--elegant-text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                          {new Date(ev.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          {ev.location ? ` · ${ev.location}` : ''}
                        </div>
                      </div>
                      <button
                        type="button" className="btn-elegant-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                        onClick={() => {
                          const d = new Date(ev.start_time);
                          setYear(d.getFullYear()); setMonth(d.getMonth()); setSelectedDay(d);
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
          </>
        )}

        {/* ── MEETINGS TAB ── */}
        {activeTab === 'meetings' && (
          <>
            {showMeetingForm && (
              <div className="elegant-card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', marginBottom: '1rem' }}>Новая встреча</h3>
                <form onSubmit={handleCreateMeeting} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <input
                    className="elegant-input" required placeholder="Название встречи *"
                    value={meetingForm.title} onChange={(e) => setMeetingForm((p) => ({ ...p, title: e.target.value }))}
                  />
                  <textarea
                    className="elegant-input" rows={3} placeholder="Описание / повестка"
                    value={meetingForm.description} onChange={(e) => setMeetingForm((p) => ({ ...p, description: e.target.value }))}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                    <input
                      className="elegant-input" placeholder="Место"
                      value={meetingForm.location} onChange={(e) => setMeetingForm((p) => ({ ...p, location: e.target.value }))}
                    />
                    <div>
                      <label className="elegant-field-label">Когда *</label>
                      <input
                        type="datetime-local" className="elegant-input" required
                        value={meetingForm.scheduled_at} onChange={(e) => setMeetingForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn-elegant" disabled={isSavingMeeting}>
                      {isSavingMeeting ? 'Создаём...' : 'Создать встречу'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {meetings.length === 0 ? (
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
                          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.3rem' }}>{m.title}</div>
                          {m.description && <p style={{ fontSize: '0.9rem', color: 'var(--elegant-text-muted)', margin: '0 0 0.5rem' }}>{m.description}</p>}
                          <div style={{ display: 'flex', gap: '1.2rem', fontSize: '0.8rem', color: 'var(--elegant-text-faint)', fontFamily: "'JetBrains Mono', monospace" }}>
                            <span>🕐 {fmtMeeting(m.scheduled_at)}</span>
                            {m.location && <span>📍 {m.location}</span>}
                            <span>👥 {m.participant_count} участников</span>
                            <span>Организатор: {m.creator_name || 'Кто-то'}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                          {isMine ? (
                            <button type="button" onClick={() => handleDeleteMeeting(m.id)} className="btn-elegant-ghost" style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>Удалить</button>
                          ) : m.is_joined ? (
                            <button type="button" onClick={() => handleLeave(m.id)} className="btn-elegant-ghost" style={{ fontSize: '0.8rem' }}>Не пойду</button>
                          ) : (
                            <button type="button" onClick={() => handleJoin(m.id)} className="btn-elegant" style={{ fontSize: '0.8rem' }}>Пойду</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Calendar;
