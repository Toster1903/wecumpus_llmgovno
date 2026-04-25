const partOfDay = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
};

const AgentHero = ({ name, onPrimary, onAgent }) => {
  const greeting = partOfDay();
  const firstName = name?.split(' ')?.[0] || 'студент';
  return (
    <section className="agent-hero animate-page-in">
      <span className="agent-tag">
        <span className="agent-tag-pulse" />
        AI Agent · Online
      </span>
      <h1 className="hero-greeting">
        {greeting}, <em>{firstName}.</em>
      </h1>
      <p className="hero-message">
        Я подобрал для тебя сегодняшнюю ленту кампуса: новые мэтчи, попутчики, события и идеи для встреч.
        Откроем агента — и я расскажу подробнее.
      </p>
      <div className="hero-actions">
        <button type="button" className="btn-ink" onClick={onPrimary}>
          Открыть мои мэтчи
        </button>
        <button type="button" className="btn-meta" onClick={onAgent}>
          ⌘K · ask agent
        </button>
      </div>
    </section>
  );
};

export default AgentHero;
