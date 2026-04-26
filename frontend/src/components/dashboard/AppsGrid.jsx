const APPS = [
  { id: 'matches', label: 'Match',       icon: '☁', tone: 'sage',       desc: 'Подбор однокурсников по интересам' },
  { id: 'inbox',   label: 'Inbox',       icon: '◈', tone: 'rose',       desc: 'Личные и клубные чаты' },
  { id: 'posts',   label: 'Лента',       icon: '◐', tone: 'sky',        desc: 'Статьи и посты сообщества' },
  { id: 'profile', label: 'Profile',     icon: '◇', tone: 'butter',     desc: 'Твоя анкета и интересы' },
  { id: 'events',  label: 'Events',      icon: '◉', tone: 'terracotta', desc: 'События кампуса' },
  { id: 'rides',   label: 'Rides',       icon: '◊', tone: '',           desc: 'Попутки с картой маршрутов' },
  { id: 'plan',    label: 'Plan',        icon: '⊛', tone: 'sage',       desc: 'Календарь и встречи' },
  { id: 'market',  label: 'Marketplace', icon: '❋', tone: 'rose',       desc: 'Объявления с фотографиями' },
];

const AppsGrid = ({ onNavigate, badges = {} }) => {
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">
          Все <em>сервисы</em>
        </h2>
        <span className="section-meta">{APPS.length} apps</span>
      </div>
      <div className="apps-grid">
        {APPS.map((a) => (
          <button
            key={a.id}
            type="button"
            className="app-card"
            onClick={() => onNavigate?.(a.id)}
          >
            <span className={`app-icon ${a.tone}`}>{a.icon}</span>
            <div className="app-card-body">
              <div className="app-name">{a.label}</div>
              <div className="app-desc">{a.desc}</div>
            </div>
            <div className="app-foot">
              <span>{badges[a.id] ? `${badges[a.id]} new` : 'open'}</span>
              <span>→</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default AppsGrid;
