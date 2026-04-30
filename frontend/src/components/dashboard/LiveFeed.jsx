import { useEffect, useMemo, useState } from 'react';

const TONES = ['sage', 'rose', 'sky', 'butter', 'terracotta'];

const LiveFeed = ({ items = [], onOpen, onItemClick }) => {
  // Reset reveal counter when the items reference changes – do it during render
  // (instead of inside an effect) per react-hooks/set-state-in-effect.
  const itemsKey = useMemo(() => items.map((it, i) => it.id || i).join('|'), [items]);
  const [keyForReset, setKeyForReset] = useState(itemsKey);
  const [inIdx, setInIdx] = useState(0);
  const [hot, setHot] = useState(0);

  if (keyForReset !== itemsKey) {
    setKeyForReset(itemsKey);
    setInIdx(0);
  }

  // staggered reveal
  useEffect(() => {
    if (items.length === 0) return undefined;
    const timer = setInterval(() => {
      setInIdx((i) => {
        if (i >= items.length) {
          clearInterval(timer);
          return i;
        }
        return i + 1;
      });
    }, 40);
    return () => clearInterval(timer);
  }, [items]);

  // highlight rotator
  useEffect(() => {
    if (items.length === 0) return undefined;
    const id = setInterval(() => setHot((h) => (h + 1) % items.length), 2400);
    return () => clearInterval(id);
  }, [items.length]);

  return (
    <div className="feed-card">
      <div className="feed-head">
        <div className="feed-title">
          <span className="feed-pulse" />
          Live on campus
        </div>
        <div className="feed-meta">Updated · just now</div>
      </div>
      <div className="feed-list">
        {items.length === 0 && (
          <div style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', padding: '0.6rem 0.4rem' }}>
            Лента пустая — как только появятся мэтчи и события, я покажу их здесь.
          </div>
        )}
        {items.map((it, i) => {
          const tone = it.tone || TONES[i % TONES.length];
          const clickable = Boolean(it.navTarget);
          return (
            <div
              key={it.id || `${it.who}-${i}`}
              className={`feed-row ${i < inIdx ? 'is-in' : ''} ${i === hot ? 'is-hot' : ''} ${clickable ? 'feed-row-link' : ''}`}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => onItemClick?.(it) : undefined}
              onKeyDown={clickable ? (e) => e.key === 'Enter' && onItemClick?.(it) : undefined}
              style={clickable ? { cursor: 'pointer' } : undefined}
            >
              <span className={`feed-dot ${tone}`} />
              <div className="feed-body">
                <div className="feed-line">
                  <span className="feed-who">{it.who}</span> {it.what}
                </div>
                <div className="feed-sub">
                  <span className="feed-tag">{it.tag}</span>
                  <span>·</span>
                  <span>{it.time}</span>
                  {it.mutual && (
                    <>
                      <span>·</span>
                      <span style={{ color: 'var(--terracotta)' }}>{it.mutual}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="feed-foot">
        <span>Stream · {items.length} events</span>
        <button type="button" className="feed-link" onClick={onOpen}>
          Open feed →
        </button>
      </div>
    </div>
  );
};

export default LiveFeed;
