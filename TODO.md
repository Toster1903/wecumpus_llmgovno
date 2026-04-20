# 🦋 Wecupmus - План разработки

## 📋 АРХИТЕКТУРА

### Backend структура:
```
backend/app/
├── main.py                    (точка входа, инициализация БД)
├── core/
│   ├── config.py             (конфиги, env переменные)
│   └── security.py           (JWT, bcrypt, паролки)
├── db/
│   └── session.py            (подключение к БД)
├── models/
│   ├── user.py               (User модель)
│   └── profile.py            (Profile модель)
├── schemas/
│   ├── user.py               (Pydantic схемы для User)
│   └── profile.py            (Pydantic схемы для Profile)
├── services/
│   ├── user_service.py       (логика User - создание, поиск)
│   ├── profile_service.py    (логика Profile - создание, матчи)
│   └── ml_service.py         (embeddings для векторной БД)
└── api/
    ├── deps.py               (зависимости для маршрутов - auth, валидация)
    └── v1/endpoints/
        ├── auth.py           (POST /login)
        ├── users.py          (POST /users, GET/PATCH /users/me)
        ├── profiles.py       (POST/GET /profiles, GET /profiles/match)
        └── matches.py        (POST /matches/like, POST /matches/skip - НЕ СОЗДАН)

### Frontend структура:
```
frontend/src/
├── App.jsx                    (роутинг, навигация, auth state)
├── pages/
│   ├── Login.jsx              (логин + регистрация)
│   ├── Matches.jsx            (карточка матча + заглушки)
│   ├── Dashboard.jsx          (заглушка панели)
│   └── ProfileBuilder.jsx     (заглушка профиля)
└── api/
    └── axios.js               (API клиент с JWT автоинъекцией)
```

---

## ✅ ГОТОВО (Sprint 0)

### Backend:
- ✅ PostgreSQL + pgvector инициализация
- ✅ SQLAlchemy ORM модели (User, Profile)
- ✅ JWT аутентификация (login endpoint)
- ✅ Bcrypt хеширование паролей
- ✅ OAuth2 защита маршрутов
- ✅ CORS middleware
- ✅ Базовый профиль сервис (GET /profiles/match)

### Frontend:
- ✅ Vite + React + Tailwind v4
- ✅ Логин/Регистрация форма
- ✅ Сохранение JWT в localStorage
- ✅ Автоматическое добавление токена в headers (Axios)
- ✅ Навигация между страницами
- ✅ Карточка матча (дизайн)

---

## 🔴 КРИТИЧНО (Sprint 1 - ПЕРВЫЙ ПРИОРИТЕТ)

### Backend:

#### 1️⃣ **Модель Match (лайк/пропуск)**
```python
# backend/app/models/match.py (СОЗДАТЬ)
class Match(Base):
    __tablename__ = "matches"
    
    id: int = Column(Integer, primary_key=True)
    user_id: int = Column(Integer, ForeignKey("user.id"))
    matched_user_id: int = Column(Integer, ForeignKey("user.id"))
    action: str = Column(String)  # "like" или "skip"
    created_at: datetime = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    user = relationship("User", foreign_keys=[user_id])
    matched_user = relationship("User", foreign_keys=[matched_user_id])
```

#### 2️⃣ **Match Service (логика лайков)**
```python
# backend/app/services/match_service.py (СОЗДАТЬ)
async def like_user(user_id: int, matched_user_id: int, db: Session) -> Match
async def skip_user(user_id: int, matched_user_id: int, db: Session) -> Match
async def get_mutual_matches(user_id: int, db: Session) -> List[dict]  # взаимные лайки
```

#### 3️⃣ **Endpoints для лайков**
```python
# backend/app/api/v1/endpoints/matches.py (СОЗДАТЬ)
POST /api/v1/matches/like     # {matched_user_id}
POST /api/v1/matches/skip     # {matched_user_id}
GET /api/v1/matches/mutual    # Get взаимные совпадения
GET /api/v1/matches/history   # История action-ов
```

#### 4️⃣ **Фильтрация в GET /profiles/match**
Исключить уже залайканных/пропущённых пользователей:
```python
# backend/app/services/profile_service.py - обновить get_matches()
# WHERE user_id NOT IN (SELECT matched_user_id FROM matches WHERE user_id=?)
```

### Frontend:

#### 5️⃣ **Реал-тайм лайк/пропуск**
```javascript
// frontend/src/pages/Matches.jsx - обновить функции
const handleLike = async () => {
  await api.post('/matches/like', { matched_user_id: current.user_id })
  setCurrentIndex((prev) => (prev + 1) % users.length)
}

const handleSkip = async () => {
  await api.post('/matches/skip', { matched_user_id: current.user_id })
  setCurrentIndex((prev) => (prev + 1) % users.length)
}
```

#### 6️⃣ **Обновление списка матчей**
После каждого лайка перезагрузить список (GET /profiles/match) чтобы исключить уже обработанных

---

## 🟡 ВАЖНО (Sprint 2)

### Backend:

#### 7️⃣ **Профиль сервис для нового юзера**
```python
# backend/app/services/profile_service.py - новый метод
async def create_profile(user_id: int, profile_data: ProfileCreate, db: Session) -> Profile
# Генерировать embedding через ML service
```

#### 8️⃣ **Endpoint для редактирования профиля**
```python
# backend/app/api/v1/endpoints/profiles.py - добавить
PATCH /api/v1/profiles/me  # {full_name, age, bio, interests}
GET /api/v1/profiles/me     # Get текущий профиль
```

#### 9️⃣ **Endpoint для Get/Update User**
```python
# backend/app/api/v1/endpoints/users.py - добавить
GET /api/v1/users/me        # Текущий пользователь
PATCH /api/v1/users/me      # {email, password}
DELETE /api/v1/users/me     # Удаление аккаунта
```

### Frontend:

#### 🔟 **ProfileSetup страница (для новых юзеров)**
```javascript
// frontend/src/pages/ProfileSetup.jsx (СОЗДАТЬ)
- Форма: имя, возраст, интересы (мультиселект), био
- Кнопка: "Создать профиль"
- После создания → redirect на Matches
```

#### 1️⃣1️⃣ **Логика: редирект новых юзеров**
```javascript
// frontend/src/App.jsx - обновить
if (isAuthenticated) {
  const userProfile = await api.get('/profiles/me')
  if (!userProfile) {
    return <ProfileSetup />  // Новый юзер
  }
  // else: Matches страница
}
```

#### 1️⃣2️⃣ **ProfileBuilder → editable**
```javascript
// frontend/src/pages/ProfileBuilder.jsx - обновить
- Загружать реальные данные с GET /api/v1/profiles/me
- Редактируемые поля (name, age, interests, bio)
- PATCH /api/v1/profiles/me при сохранении
```

#### 1️⃣3️⃣ **Dashboard → контент**
```javascript
// frontend/src/pages/Dashboard.jsx - обновить
- GET /api/v1/matches/mutual  → показать взаимные лайки (Connected)
- GET /api/v1/matches/history → показать историю лайков/пропусков
- Статистика: сколько лайков, совпадений
```

---

## 🟢 ВТОРОСТЕПЕННОЕ (Sprint 3+)

### Backend:

#### 1️⃣4️⃣ **Сообщения между матчами**
```python
# backend/app/models/message.py (СОЗДАТЬ)
class Message(Base):
    __tablename__ = "messages"
    
    id: int = Column(Integer, primary_key=True)
    sender_id: int = Column(Integer, ForeignKey("user.id"))
    receiver_id: int = Column(Integer, ForeignKey("user.id"))
    content: str = Column(String)
    created_at: datetime = Column(DateTime, default=datetime.utcnow)
    is_read: bool = Column(Boolean, default=False)
```

#### 1️⃣5️⃣ **AI генерация рекомендаций**
```python
# backend/app/services/ml_service.py - новый метод
async def generate_why_match_reason(user1: User, user2: User) -> str
# Сравнить embeddings и интересы, вернуть текст "Оба любят кодинг и кофе"
```

#### 1️⃣6️⃣ **Поиск и фильтры**
```python
# backend/app/api/v1/endpoints/profiles.py - добавить
GET /api/v1/profiles/search?interests=coding&age_min=18&age_max=25
```

### Frontend:

#### 1️⃣7️⃣ **Chat страница**
```javascript
// frontend/src/pages/Chat.jsx (СОЗДАТЬ)
- Список взаимных матчей
- Чат окно в реал-тайм (WebSocket)
- История сообщений
```

#### 1️⃣8️⃣ **Уведомления**
```javascript
// frontend/src/components/Notifications.jsx (СОЗДАТЬ)
- Toast при новом матче
- Счётчик новых сообщений
```

#### 1️⃣9️⃣ **Мобильная версия**
```javascript
// Адаптация текущего дизайна для мобильных:
- Одна колонка вместо трёх
- Меню хамбургер вместо навигации
- Touch-friendly кнопки
```

---

## 🏗️ DATABASE SCHEMA (ИТОГОВАЯ)

```sql
-- Existing
CREATE TABLE "user" (
  id SERIAL PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE profile (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES "user"(id),
  full_name VARCHAR NOT NULL,
  age INTEGER NOT NULL,
  bio TEXT,
  interests TEXT[] NOT NULL,
  embedding vector(384),
  created_at TIMESTAMP DEFAULT NOW()
);

-- New for Sprint 1
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES "user"(id),
  matched_user_id INTEGER REFERENCES "user"(id),
  action VARCHAR CHECK (action IN ('like', 'skip')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, matched_user_id, action)
);

-- For later (Sprint 3+)
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES "user"(id),
  receiver_id INTEGER REFERENCES "user"(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 ТЕКУЩИЙ СТАТУС

```
Sprint 0: ✅ 100% (Auth + дизайн)
Sprint 1: 🔴 0% (Матчи + профиль)
Sprint 2: 🟡 0% (Контент)
Sprint 3+: 🟢 0% (Сообщения)
```

### Следующий шаг:
**Нужно реализовать Sprint 1** - модель Match, endpoints, функцию лайка/пропуска в фронте.

Хочешь начать с Backend (Match модель) или Frontend (обновить Matches.jsx)?
