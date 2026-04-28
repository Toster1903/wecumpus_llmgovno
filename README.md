# Wecampus

Социальная платформа для студентов университета Сириус (Сочи): мэтчинг по интересам, клубы, чат, мероприятия, поездки, встречи, маркетплейс и AI-ассистент.

## Содержание

- [Технологический стек](#технологический-стек)
- [Структура репозитория](#структура-репозитория)
- [Быстрый старт (Docker)](#быстрый-старт-docker)
- [Запуск без Docker](#запуск-без-docker)
- [Переменные окружения](#переменные-окружения)
- [API — все эндпоинты](#api--все-эндпоинты)
- [Аутентификация](#аутентификация)
- [Примечания по разработке](#примечания-по-разработке)
- [Решение проблем](#решение-проблем)

---

## Технологический стек

| Слой | Технологии |
|------|-----------|
| Backend | Python 3.11, FastAPI, SQLAlchemy, Pydantic v2, python-jose, bcrypt |
| База данных | PostgreSQL + расширение pgvector |
| ML / эмбеддинги | sentence-transformers |
| AI-ассистент | Ollama (локальный LLM, по умолчанию `qwen2.5:3b`) |
| Почта | SMTP (Gmail и др.) |
| Telegram | Telegram Login Widget (верификация HMAC) |
| Frontend | React 19, Vite, Axios |
| Инфраструктура | Docker, Docker Compose |

---

## Структура репозитория

```
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py                  # зависимости (get_current_user и др.)
│   │   │   └── v1/endpoints/            # REST-эндпоинты
│   │   │       ├── auth.py
│   │   │       ├── users.py
│   │   │       ├── profiles.py
│   │   │       ├── matches.py
│   │   │       ├── messages.py
│   │   │       ├── clubs.py
│   │   │       ├── events.py
│   │   │       ├── rides.py
│   │   │       ├── plan.py
│   │   │       ├── market.py
│   │   │       ├── posts.py
│   │   │       ├── feed.py
│   │   │       └── ai.py
│   │   ├── core/
│   │   │   ├── config.py                # настройки (pydantic-settings)
│   │   │   └── security.py              # JWT, bcrypt, Telegram HMAC
│   │   ├── db/
│   │   │   └── session.py               # SQLAlchemy-сессия
│   │   ├── models/                      # ORM-модели
│   │   ├── schemas/                     # Pydantic-схемы
│   │   ├── services/                    # бизнес-логика
│   │   └── main.py                      # точка входа FastAPI
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/          # axios-клиент
│   │   ├── components/
│   │   ├── pages/
│   │   └── styles/
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

---

## Быстрый старт (Docker)

### 1. Настройте учётные данные

Откройте `docker-compose.yml` и замените `your_password` в переменных:

- `POSTGRES_PASSWORD`
- `DATABASE_URL`

Также создайте файл `backend/.env` (см. раздел [Переменные окружения](#переменные-окружения)).

### 2. Запустите все сервисы

```bash
docker compose up --build
```

### 3. Откройте приложение

| Сервис | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger UI (интерактивная документация) | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

Порты по умолчанию:

- PostgreSQL: `5433` (проброшен с контейнерного `5432`)
- Backend: `8000`
- Frontend: `5173`

---

## Запуск без Docker

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

При первом старте backend автоматически:
- инициализирует все таблицы в БД
- создаёт расширение `pgvector` (если не существует)
- создаёт папку `backend/app/static/club_avatars`

### Frontend

```bash
cd frontend
npm install
npm run dev -- --host
```

Base URL для API задаётся в [frontend/src/api/axios.js](frontend/src/api/axios.js):

```
http://localhost:8000/api/v1
```

---

## Переменные окружения

Создайте файл `backend/.env`. Все переменные читаются через `pydantic-settings`.

### Обязательные

| Переменная | Описание | Пример |
|-----------|----------|--------|
| `DATABASE_URL` | Строка подключения к PostgreSQL | `postgresql+psycopg2://user:pass@localhost:5432/wecampus` |
| `SECRET_KEY` | Секрет для подписи JWT (≥ 32 символа) | `python -c "import secrets; print(secrets.token_hex(32))"` |

### Дополнительные

| Переменная | По умолчанию | Описание |
|-----------|-------------|----------|
| `ALGORITHM` | `HS256` | Алгоритм JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` (7 дней) | Срок жизни токена |
| `ALLOWED_ORIGINS` | `http://localhost:5173,...` | CORS — список разрешённых origin через запятую |
| `FRONTEND_URL` | `http://localhost:5173` | Базовый URL фронтенда (для ссылок в письмах) |
| `OLLAMA_URL` | `http://localhost:11434` | URL Ollama (локальный LLM) |
| `OLLAMA_MODEL` | `qwen2.5:3b` | Модель Ollama |
| `TELEGRAM_BOT_TOKEN` | — | Токен Telegram-бота (для Login Widget) |
| `TELEGRAM_BOT_USERNAME` | — | Username бота без `@` |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP-сервер для отправки писем |
| `SMTP_PORT` | `587` | SMTP-порт |
| `SMTP_USER` | — | Логин SMTP |
| `SMTP_PASSWORD` | — | Пароль SMTP (для Gmail — App Password) |
| `SMTP_FROM` | — | Адрес отправителя |

> **Важно:** `SECRET_KEY` обязан отличаться от значения по умолчанию и содержать ≥ 32 символа — иначе сервер не стартует.

---

## API — все эндпоинты

Все маршруты имеют префикс `/api/v1`.  
Защищённые маршруты требуют заголовок: `Authorization: Bearer <access_token>`.

---

### `auth` — Аутентификация

| Метод | Путь | Авторизация | Описание |
|-------|------|-------------|----------|
| `POST` | `/auth/login` | — | Вход по email + пароль (form-data: `username`, `password`). Лимит: 5 запросов/мин. Возвращает JWT. |
| `POST` | `/auth/telegram` | — | Вход через Telegram Login Widget. Тело: `TelegramAuthData` (id, first_name, username, hash и др.). |
| `GET` | `/auth/verify-email` | — | Подтверждение email по токену из письма. Query-параметр: `token`. |
| `POST` | `/auth/resend-verification` | — | Повторная отправка письма с подтверждением. Тело: `{"email": "..."}`. Лимит: 3 запроса/час. |

---

### `users` — Пользователи

| Метод | Путь | Авторизация | Описание |
|-------|------|-------------|----------|
| `POST` | `/users/` | — | Регистрация. Тело: `{"email": "...", "password": "..."}`. После регистрации отправляется письмо для подтверждения email. |
| `GET` | `/users/me` | ✅ | Данные текущего пользователя. |
| `DELETE` | `/users/me` | ✅ | Удаление аккаунта. |

---

### `profiles` — Профили

| Метод | Путь | Авторизация | Описание |
|-------|------|-------------|----------|
| `POST` | `/profiles/` | ✅ | Создание профиля. |
| `GET` | `/profiles/me` | ✅ | Профиль текущего пользователя. |
| `PATCH` | `/profiles/me` | ✅ | Обновление профиля. |
| `GET` | `/profiles/me/preferences` | ✅ | Предпочтения текущего пользователя. |
| `GET` | `/profiles/me/status` | ✅ | Статус профиля (заполнен / нет). |
| `GET` | `/profiles/user/{user_id}` | ✅ | Профиль пользователя по ID. |
| `GET` | `/profiles/match` | ✅ | Список кандидатов для мэтчинга (ML-ранжирование по векторному сходству). |
| `GET` | `/profiles/search` | ✅ | Поиск пользователей. Query-параметр: `q`. |

---

### `matches` — Мэтчинг

| Метод | Путь | Авторизация | Описание |
|-------|------|-------------|----------|
| `POST` | `/matches/like` | ✅ | Лайк пользователя. Тело: `{"user_id": <int>}`. |
| `POST` | `/matches/skip` | ✅ | Скип пользователя. Тело: `{"user_id": <int>}`. |
| `GET` | `/matches/mutual` | ✅ | Список взаимных мэтчей. |
| `GET` | `/matches/history` | ✅ | История всех действий (лайки / скипы). |

---

### `messages` — Сообщения

| Метод | Путь | Авторизация | Описание |
|-------|------|-------------|----------|
| `GET` | `/messages/{other_user_id}` | ✅ | История личной переписки с пользователем. |
| `POST` | `/messages/` | ✅ | Отправка личного сообщения. Тело: `{"receiver_id": <int>, "content": "..."}`. |
| `GET` | `/messages/clubs/{club_id}` | ✅ | История сообщений в чате клуба. |
| `POST` | `/messages/clubs/{club_id}` | ✅ | Отправка сообщения в чат клуба. |

---

### `clubs` — Клубы

| Метод | Путь | Авторизация | Описание |
|-------|------|-------------|----------|
| `GET` | `/clubs/` | ✅ | Список всех клубов. |
| `POST` | `/clubs/` | ✅ | Создание клуба. |
| `GET` | `/clubs/{club_id}` | ✅ | Информация о клубе. |
| `GET` | `/clubs/users/search` | ✅ | Поиск пользователей для приглашения. Query: `q`. |
| `POST` | `/clubs/{club_id}/invite` | ✅ | Пригласить пользователя в клуб. |
| `GET` | `/clubs/invites/me` | ✅ | Входящие приглашения текущего пользователя. |
| `POST` | `/clubs/invites/{invite_id}/accept` | ✅ | Принять приглашение. |
| `POST` | `/clubs/invites/{invite_id}/decline` | ✅ | Отклонить приглашение. |

---

### `events` — Мероприятия

| Метод | Путь | Авторизация | Описание |
|-------|------|-------------|----------|
| `GET` | `/events/` | ✅ | Список мероприятий. |
| `POST` | `/events/` | ✅ | Создание мероприятия. |
| `GET` | `/events/{event_id}` | ✅ | Информация о мероприятии. |
| `DELETE` | `/events/{event_id}` | ✅ | Удаление мероприятия (только создатель). |

---

### `rides` — Поездки

| Метод | Путь | Авторизация | Описание |
|-------|------|-------------|----------|
| `GET` | `/rides/` | ✅ | Список поездок. |
| `POST` | `/rides/` | ✅ | Создание поездки. |
| `POST` | `/rides/{ride_id}/join` | ✅ | Присоединиться к поездке. |
| `POST` | `/rides/{ride_id}/leave` | ✅ | Покинуть поездку. |
| `DELETE` | `/rides/{ride_id}` | ✅ | Удалить поездку (только водитель). |

---

### `plan` — Встречи / планы

| Метод | Путь | Авторизация | Описание |
|-------|------|-------------|----------|
| `GET` | `/plan/` | ✅ | Список встреч. |
| `POST` | `/plan/` | ✅ | Создание встречи. |
| `POST` | `/plan/{meeting_id}/join` | ✅ | Присоединиться к встрече. |
| `POST` | `/plan/{meeting_id}/leave` | ✅ | Покинуть встречу. |
| `DELETE` | `/plan/{meeting_id}` | ✅ | Удалить встречу (только организатор). |

---

### `market` — Маркетплейс

| Метод | Путь | Авторизация | Описание |
|-------|------|-------------|----------|
| `GET` | `/market/` | ✅ | Список объявлений. |
| `POST` | `/market/` | ✅ | Создание объявления. |
| `GET` | `/market/{item_id}` | ✅ | Объявление по ID. |
| `PATCH` | `/market/{item_id}` | ✅ | Обновление объявления (только автор). |
| `DELETE` | `/market/{item_id}` | ✅ | Удаление объявления (только автор). |

---

### `posts` — Посты

| Метод | Путь | Авторизация | Описание |
|-------|------|-------------|----------|
| `GET` | `/posts/` | ✅ | Список постов, отфильтрованных по интересам текущего пользователя. |
| `POST` | `/posts/` | ✅ | Создание поста. Тело: `PostCreate` (title, content, tags). |
| `DELETE` | `/posts/{post_id}` | ✅ | Удаление поста (только автор). |

---

### `feed` — Агрегированная лента

| Метод | Путь | Авторизация | Описание |
|-------|------|-------------|----------|
| `GET` | `/feed/` | ✅ | Лента активности: события + поездки + посты + новые взаимные мэтчи. Query-параметры: `limit` (макс. 100, по умолчанию 30), `ai_rank` (bool, AI-ранжирование по интересам). |

---

### `ai` — AI-ассистент

Требует запущенного [Ollama](https://ollama.com) с выбранной моделью.

| Метод | Путь | Авторизация | Описание |
|-------|------|-------------|----------|
| `POST` | `/ai/chat` | ✅ | Чат с AI. Тело: `{"message": "...", "history": [{"role": "user"/"assistant", "content": "..."}]}`. |
| `POST` | `/ai/match-explain` | ✅ | Объяснение совместимости с кандидатом. Тело: `{"candidate_user_id": <int>}`. |

---

## Аутентификация

Система поддерживает три способа входа:

1. **Email + пароль** — стандартная регистрация с подтверждением email.
2. **Telegram Login Widget** — вход через виджет Telegram (HMAC-верификация по `TELEGRAM_BOT_TOKEN`).
3. **JWT Bearer Token** — все защищённые запросы передают токен в заголовке:

```
Authorization: Bearer <access_token>
```

Токены действительны 7 дней (настраивается через `ACCESS_TOKEN_EXPIRE_MINUTES`).

### Поток регистрации

```
POST /users/        → создаётся аккаунт, отправляется письмо
GET  /auth/verify-email?token=...  → email подтверждён
POST /auth/login    → получен access_token
```

---

## Примечания по разработке

- CORS настраивается через `ALLOWED_ORIGINS` в `.env`; в дефолтной конфигурации открыт только для `localhost:5173`.
- Аватары клубов хранятся в `backend/app/static/club_avatars/`.
- ML-ранжирование мэтчей использует векторные эмбеддинги (pgvector). При первом запуске `sentence-transformers` скачивает модели — это занимает время.
- AI-эндпоинты (`/ai/*`) и AI-ранжирование ленты (`/feed/?ai_rank=true`) требуют работающего Ollama с загруженной моделью:
  ```bash
  ollama pull qwen2.5:3b
  ollama serve
  ```

---

## Решение проблем

**Backend не подключается к БД**
- Проверьте `DATABASE_URL` в `.env` / `docker-compose.yml`.
- Убедитесь, что контейнер PostgreSQL запущен и здоров: `docker compose ps`.
- Порт `5433` на хосте не должен быть занят другим процессом.

**Frontend не достигает backend**
- Убедитесь, что backend работает на `localhost:8000`.
- Проверьте базовый URL в [frontend/src/api/axios.js](frontend/src/api/axios.js).
- При запуске через Docker убедитесь, что оба сервиса запущены в одной сети (`docker compose up`).

**Ошибка `SECRET_KEY не задан`**
- Создайте `backend/.env` и задайте `SECRET_KEY` (≥ 32 символа):
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"
  ```

**Telegram-вход не работает**
- Убедитесь, что `TELEGRAM_BOT_TOKEN` корректный.
- Домен фронтенда должен быть прописан в настройках бота через @BotFather.

**AI-эндпоинты возвращают ошибку**
- Проверьте, что Ollama запущен: `curl http://localhost:11434/api/tags`.
- Убедитесь, что нужная модель загружена: `ollama list`.
