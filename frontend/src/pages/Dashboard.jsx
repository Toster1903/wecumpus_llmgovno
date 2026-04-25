import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import AgentHero from '../components/dashboard/AgentHero';
import LiveFeed from '../components/dashboard/LiveFeed';
import AppsGrid from '../components/dashboard/AppsGrid';
import Suggestions from '../components/dashboard/Suggestions';

const STATIC_PULSE = [
  { id: 's1', tone: 'sage',       who: 'Кампус',  what: 'открывает новый набор клубов на этой неделе', tag: 'Spaces',  time: '2 ч назад' },
  { id: 's2', tone: 'butter',     who: 'Лекторий', what: 'AI Talks #14 — четверг 19:00, аудитория 401', tag: 'Event',   time: 'сегодня' },
  { id: 's3', tone: 'sky',        who: 'Попутка', what: 'до общежития №5 — три места свободно',          tag: 'Ride',    time: '20 мин назад' },
];

const Dashboard = ({ onUnauthorized, onNavigate, onOpenUserProfile, onSayHi }) => {
  const [profile, setProfile] = useState(null);
  const [mutual, setMutual] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleErr = (e) => {
      if (e?.response?.status === 401) {
        onUnauthorized?.();
        return;
      }
      setErrorMessage(e?.response?.data?.detail || 'Не удалось загрузить ленту.');
    };

    api
      .get('/profiles/me')
      .then((r) => setProfile(r.data))
      .catch(handleErr);

    api
      .get('/matches/mutual')
      .then((r) => setMutual(r.data?.mutual_matches || []))
      .catch(handleErr);

    api
      .get('/profiles/match', { params: { limit: 6 } })
      .then((r) => setSuggestions(Array.isArray(r.data) ? r.data : []))
      .catch(handleErr);
  }, [onUnauthorized]);

  const feedItems = useMemo(() => {
    const matchEvents = mutual.slice(0, 5).map((m, i) => ({
      id: `match-${m.user_id || i}`,
      tone: 'rose',
      who: m.name || m.full_name || 'Кто-то',
      what: 'ответил тебе взаимностью',
      tag: 'Match',
      time: m.matched_at ? new Date(m.matched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'just now',
    }));
    return [...matchEvents, ...STATIC_PULSE];
  }, [mutual]);

  return (
    <>
      {errorMessage && (
        <div className="hub-msg-error" style={{ marginBottom: '1.2rem' }}>
          {errorMessage}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: '3rem', alignItems: 'center' }} className="dashboard-top">
        <AgentHero
          name={profile?.full_name}
          onPrimary={() => onNavigate?.('matches')}
          onAgent={() => onNavigate?.('chat')}
        />
        <LiveFeed items={feedItems} onOpen={() => onNavigate?.('chat')} />
      </div>

      <AppsGrid onNavigate={onNavigate} badges={{ chat: mutual.length || undefined }} />

      <Suggestions
        items={suggestions}
        onOpenProfile={(uid) => onOpenUserProfile?.(uid)}
        onSayHi={(uid) => onSayHi?.(uid)}
      />
    </>
  );
};

export default Dashboard;
