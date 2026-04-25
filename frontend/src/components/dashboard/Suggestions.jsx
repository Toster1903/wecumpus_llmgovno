const initials = (name) => {
  if (!name) return '·';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
};

const TONES = ['sage', 'rose', 'sky', 'butter', 'terracotta'];

const Suggestions = ({ items = [], onOpenProfile, onSayHi }) => {
  if (!items.length) return null;

  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">
          Picked for <em>you</em>
        </h2>
        <span className="section-meta">By AI Agent · {items.length}</span>
      </div>
      <div className="suggestions-grid">
        {items.slice(0, 3).map((p, idx) => {
          const tone = TONES[idx % TONES.length];
          return (
            <div
              key={p.user_id || p.id || idx}
              className="suggestion-card"
              onClick={() => onOpenProfile?.(p.user_id || p.id)}
            >
              <div className="suggestion-head">
                <span className="suggestion-tag live">Match</span>
                <span className="suggestion-time">{p.age ? `${p.age} y.o.` : ''}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                {p.avatar_url ? (
                  <img
                    src={p.avatar_url.startsWith('http') ? p.avatar_url : `http://localhost:8000${p.avatar_url}`}
                    alt={p.full_name}
                    className={`avatar-circle avatar-60 app-icon ${tone}`}
                    style={{ borderRadius: '50%', objectFit: 'cover', width: 60, height: 60 }}
                  />
                ) : (
                  <span className={`avatar-circle avatar-60 app-icon ${tone}`}>{initials(p.full_name)}</span>
                )}
                <div style={{ minWidth: 0 }}>
                  <div className="suggestion-name">{p.full_name}</div>
                  <div className="suggestion-meta">{p.bio || 'Без био'}</div>
                </div>
              </div>
              {Array.isArray(p.interests) && p.interests.length > 0 && (
                <div className="suggestion-chips">
                  {p.interests.slice(0, 3).map((it) => (
                    <span key={it} className="chip">
                      {it}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSayHi?.(p.user_id || p.id);
                  }}
                >
                  Say hi →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Suggestions;
