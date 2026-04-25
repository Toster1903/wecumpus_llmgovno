import { useEffect, useState } from 'react';
import api from '../api/axios';

const CATEGORIES = [
  { id: '', label: 'Все' },
  { id: 'books', label: 'Книги' },
  { id: 'notes', label: 'Конспекты' },
  { id: 'equipment', label: 'Техника' },
  { id: 'other', label: 'Другое' },
];

const CONDITIONS = [
  { id: 'new', label: 'Новое' },
  { id: 'good', label: 'Хорошее' },
  { id: 'used', label: 'Б/у' },
];

const EMPTY_FORM = { title: '', description: '', price: '0', category: 'other', condition: 'good' };

const Marketplace = ({ onUnauthorized }) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [myUserId, setMyUserId] = useState(null);

  const load = async (cat = categoryFilter) => {
    setIsLoading(true);
    setError('');
    try {
      const params = cat ? { category: cat } : {};
      const [itemsRes, meRes] = await Promise.all([
        api.get('/market/', { params }),
        api.get('/users/me'),
      ]);
      setItems(itemsRes.data || []);
      setMyUserId(meRes.data?.id);
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось загрузить объявления.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCategoryChange = (cat) => {
    setCategoryFilter(cat);
    load(cat);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        price: parseFloat(form.price) || 0,
        category: form.category,
        condition: form.condition,
      };
      await api.post('/market/', payload);
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось создать объявление.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkSold = async (itemId) => {
    try {
      const res = await api.patch(`/market/${itemId}`, { is_available: false });
      setItems((prev) => prev.filter((it) => it.id !== itemId || res.data.is_available));
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось обновить объявление.');
    }
  };

  const handleDelete = async (itemId) => {
    try {
      await api.delete(`/market/${itemId}`);
      setItems((prev) => prev.filter((it) => it.id !== itemId));
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось удалить объявление.');
    }
  };

  const condLabel = (c) => CONDITIONS.find((x) => x.id === c)?.label || c;
  const catLabel = (c) => CATEGORIES.find((x) => x.id === c)?.label || c;

  return (
    <div className="elegant-shell">
      <div className="elegant-content" style={{ maxWidth: 1000 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div>
            <div className="label-mono" style={{ marginBottom: '0.3rem' }}>Campus</div>
            <h1 className="elegant-title">Маркетплейс</h1>
          </div>
          <button type="button" className="btn-elegant" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Отмена' : '+ Продать'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleCategoryChange(c.id)}
              className={categoryFilter === c.id ? 'btn-elegant' : 'btn-elegant-ghost'}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem' }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {error && <div className="elegant-msg-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {showForm && (
          <div className="elegant-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', marginBottom: '1rem' }}>Новое объявление</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <input
                className="elegant-input" required placeholder="Название *"
                value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
              <textarea
                className="elegant-input" rows={3} placeholder="Описание"
                value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label className="elegant-field-label">Цена (₽, 0 = бесплатно)</label>
                  <input
                    type="number" min="0" step="1" className="elegant-input"
                    value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="elegant-field-label">Категория</label>
                  <select
                    className="elegant-input"
                    value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  >
                    {CATEGORIES.filter((c) => c.id).map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="elegant-field-label">Состояние</label>
                  <select
                    className="elegant-input"
                    value={form.condition} onChange={(e) => setForm((p) => ({ ...p, condition: e.target.value }))}
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-elegant" disabled={isSaving}>
                  {isSaving ? 'Публикуем...' : 'Опубликовать'}
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="elegant-card"><span className="spin" /> Загружаем объявления...</div>
        ) : items.length === 0 ? (
          <div className="elegant-card" style={{ textAlign: 'center', color: 'var(--elegant-text-muted)', padding: '3rem 1rem' }}>
            Объявлений пока нет. Станьте первым!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {items.map((it) => {
              const isMine = it.seller_id === myUserId;
              return (
                <div key={it.id} className="elegant-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: '1rem', fontWeight: 600, color: 'var(--elegant-text)', lineHeight: 1.3 }}>
                      {it.title}
                    </span>
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', fontWeight: 700, color: 'var(--elegant-primary)', flexShrink: 0, marginLeft: '0.5rem' }}>
                      {Number(it.price) === 0 ? 'Бесплатно' : `${Number(it.price).toLocaleString()} ₽`}
                    </span>
                  </div>

                  {it.description && (
                    <p style={{ fontSize: '0.88rem', color: 'var(--elegant-text-muted)', margin: 0, lineHeight: 1.4 }}>{it.description}</p>
                  )}

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span className="elegant-chip" style={{ fontSize: '0.65rem' }}>{catLabel(it.category)}</span>
                    <span className="elegant-chip" style={{ fontSize: '0.65rem' }}>{condLabel(it.condition)}</span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--elegant-text-faint)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {it.seller_name || 'Продавец'}
                  </div>

                  {isMine && (
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                      <button type="button" onClick={() => handleMarkSold(it.id)} className="btn-elegant-ghost" style={{ flex: 1, fontSize: '0.75rem', padding: '0.3rem' }}>
                        Продано
                      </button>
                      <button type="button" onClick={() => handleDelete(it.id)} className="btn-elegant-ghost" style={{ flex: 1, fontSize: '0.75rem', padding: '0.3rem', color: 'var(--terracotta)', borderColor: 'var(--terracotta)' }}>
                        Удалить
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
