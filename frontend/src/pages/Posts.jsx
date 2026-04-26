import { useEffect, useState } from 'react';
import api from '../api/axios';

const BASE_URL = 'http://localhost:8000';

const resolveUrl = (url) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${BASE_URL}${url}`;
};

const EMPTY_FORM = { title: '', content: '', tagDraft: '', tags: [] };

const Posts = ({ onUnauthorized }) => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [myUserId, setMyUserId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [postsRes, meRes] = await Promise.all([
        api.get('/posts/'),
        api.get('/users/me'),
      ]);
      setPosts(postsRes.data || []);
      setMyUserId(meRes.data?.id);
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось загрузить статьи.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addTag = () => {
    const t = form.tagDraft.trim().toLowerCase();
    if (!t || form.tags.includes(t)) { setForm((p) => ({ ...p, tagDraft: '' })); return; }
    setForm((p) => ({ ...p, tags: [...p.tags, t].slice(0, 10), tagDraft: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      await api.post('/posts/', {
        title: form.title,
        content: form.content,
        tags: form.tags,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось опубликовать.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (postId) => {
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setError(e?.response?.data?.detail || 'Не удалось удалить.');
    }
  };

  const fmtDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="elegant-shell">
      <div className="elegant-content" style={{ maxWidth: 780 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div>
            <div className="label-mono" style={{ marginBottom: '0.3rem' }}>Campus</div>
            <h1 className="elegant-title">Лента</h1>
          </div>
          <button type="button" className="btn-elegant" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Отмена' : '+ Написать'}
          </button>
        </div>

        {error && <div className="elegant-msg-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {showForm && (
          <div className="elegant-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', marginBottom: '1rem' }}>Новая статья</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <input
                className="elegant-input" required placeholder="Заголовок *"
                value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
              <textarea
                className="elegant-input" rows={6} required placeholder="Текст статьи *"
                value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              />
              <div>
                <label className="elegant-field-label">Теги (Enter для добавления)</label>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem' }}>
                  <input
                    className="elegant-input"
                    style={{ flex: 1 }}
                    placeholder="Тег (например: python, учёба, кино)"
                    value={form.tagDraft}
                    onChange={(e) => setForm((p) => ({ ...p, tagDraft: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  />
                  <button type="button" onClick={addTag} className="btn-elegant-ghost" style={{ flexShrink: 0 }}>+</button>
                </div>
                {form.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    {form.tags.map((t) => (
                      <button
                        key={t} type="button"
                        onClick={() => setForm((p) => ({ ...p, tags: p.tags.filter((x) => x !== t) }))}
                        className="elegant-chip"
                        style={{ cursor: 'pointer', fontSize: '0.7rem' }}
                      >
                        #{t} ×
                      </button>
                    ))}
                  </div>
                )}
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
          <div className="elegant-card"><span className="spin" /> Загружаем ленту...</div>
        ) : posts.length === 0 ? (
          <div className="elegant-card" style={{ textAlign: 'center', color: 'var(--elegant-text-muted)', padding: '3rem 1rem' }}>
            Статей пока нет. Напишите первую!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {posts.map((post) => {
              const isMine = post.author_id === myUserId;
              const isExpanded = expandedId === post.id;
              const preview = post.content.slice(0, 250);
              const hasMore = post.content.length > 250;

              return (
                <div key={post.id} className="elegant-card" style={{ padding: '1.4rem' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.7rem' }}>
                    {post.author_avatar_url ? (
                      <img
                        src={resolveUrl(post.author_avatar_url)}
                        alt=""
                        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                        👤
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--elegant-text)' }}>
                        {post.author_name || 'Студент'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--elegant-text-faint)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmtDate(post.created_at)}
                      </div>
                    </div>
                    {isMine && (
                      <button
                        type="button"
                        onClick={() => handleDelete(post.id)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--terracotta)', fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        удалить
                      </button>
                    )}
                  </div>

                  {/* Title */}
                  <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--elegant-text)', lineHeight: 1.3 }}>
                    {post.title}
                  </h2>

                  {/* Content */}
                  <p style={{ fontSize: '0.9rem', color: 'var(--elegant-text-muted)', lineHeight: 1.6, margin: '0 0 0.5rem', whiteSpace: 'pre-wrap' }}>
                    {isExpanded ? post.content : preview}
                    {hasMore && !isExpanded && '...'}
                  </p>
                  {hasMore && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : post.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--elegant-primary)', fontFamily: "'JetBrains Mono', monospace", padding: 0 }}
                    >
                      {isExpanded ? 'Свернуть' : 'Читать далее'}
                    </button>
                  )}

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                      {post.tags.map((t) => (
                        <span key={t} className="elegant-chip" style={{ fontSize: '0.68rem' }}>#{t}</span>
                      ))}
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

export default Posts;
