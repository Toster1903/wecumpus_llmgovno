import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import AgentHero from '../components/dashboard/AgentHero';
import LiveFeed from '../components/dashboard/LiveFeed';
import AppsGrid from '../components/dashboard/AppsGrid';
import Suggestions from '../components/dashboard/Suggestions';

const TYPE_TAG = { event: 'Событие', ride: 'Попутка', post: 'Статья', match: 'Мэтч' };

const Dashboard = ({ onUnauthorized, onNavigate, onOpenUserProfile, onSayHi }) => {
  const [profile, setProfile] = useState(null);
  const [mutual, setMutual] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [feedItems, setFeedItems] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleErr = (e) => {
      if (e?.response?.status === 401) { onUnauthorized?.(); return; }
      setErrorMessage(e?.response?.data?.detail || 'Не удалось загрузить данные.');
    };

    api.get('/profiles/me').then((r) => setProfile(r.data)).catch(handleErr);
    api.get('/matches/mutual').then((r) => setMutual(r.data?.mutual_matches || [])).catch(handleErr);
    api.get('/profiles/match', { params: { limit: 6 } })
      .then((r) => setSuggestions(Array.isArray(r.data) ? r.data : []))
      .catch(handleErr);

    // Real feed — try AI-ranked, fallback to plain
    api.get('/feed/', { params: { limit: 20, ai_rank: true } })
      .then((r) => setFeedItems(Array.isArray(r.data) ? r.data : []))
      .catch(() =>
        api.get('/feed/', { params: { limit: 20 } })
          .then((r) => setFeedItems(Array.isArray(r.data) ? r.data : []))
          .catch(handleErr)
      );
  }, [onUnauthorized]);

  const liveFeedItems = useMemo(() => {
    if (feedItems.length) {
      return feedItems.slice(0, 12).map((it) => ({
        id: it.id,
        tone: it.tone || 'sage',
        who: it.who || '',
        what: it.title,
        tag: TYPE_TAG[it.type] || it.type,
        time: it.time ? new Date(it.time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '',
        mutual: it.ai_reason || undefined,
      }));
    }
    // Fallback if feed is empty
    return mutual.slice(0, 5).map((m, i) => ({
      id: `match-${m.user_id || i}`,
      tone: 'rose',
      who: m.name || m.full_name || 'Сосед',
      what: 'ответил тебе взаимностью',
      tag: 'Мэтч',
      time: m.matched_at ? new Date(m.matched_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : 'сейчас',
    }));
  }, [feedItems, mutual]);

  return (
    <>
      {errorMessage && (
        <div className="hub-msg-error" style={{ marginBottom: '1.2rem' }}>{errorMessage}</div>
      )}

      <div
        style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: '3rem', alignItems: 'center' }}
        className="dashboard-top"
      >
        <AgentHero
          name={profile?.full_name}
          onPrimary={() => onNavigate?.('matches')}
          onAgent={() => onNavigate?.('chat')}
        />
        <LiveFeed items={liveFeedItems} onOpen={() => onNavigate?.('posts')} />
      </div>

      <AppsGrid onNavigate={onNavigate} badges={{ inbox: mutual.length || undefined }} />

      <Suggestions
        items={suggestions}
        onOpenProfile={(uid) => onOpenUserProfile?.(uid)}
        onSayHi={(uid) => onSayHi?.(uid)}
      />
    </>
  );
};

export default Dashboard;
