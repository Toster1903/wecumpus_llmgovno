# Wecupmus

Full-stack campus social platform with matching, clubs, chat, events, rides, planning, and marketplace modules.

## Overview

The repository contains:

- FastAPI backend with PostgreSQL (+ pgvector)
- React + Vite frontend
- Docker Compose setup for local development

Core user flow:

1. Register and login
2. Fill profile and preferences
3. Discover matches and connect via chat
4. Join clubs, events, rides, and meetings
5. Use the marketplace module

## Tech Stack

- Backend: Python 3.11, FastAPI, SQLAlchemy, Pydantic, JWT auth
- Database: PostgreSQL with pgvector extension
- ML/Embeddings: sentence-transformers
- Frontend: React 19, Vite, Axios
- Infra: Docker, Docker Compose

## Repository Structure

```text
.
|-- backend/
|   |-- app/
|   |   |-- api/v1/endpoints/   # REST endpoints
|   |   |-- core/               # settings, security
|   |   |-- db/                 # SQLAlchemy session
|   |   |-- models/             # DB models
|   |   |-- schemas/            # Pydantic schemas
|   |   |-- services/           # business logic
|   |   `-- main.py             # FastAPI app entrypoint
|   |-- Dockerfile
|   `-- requirements.txt
|-- frontend/
|   |-- src/
|   |   |-- api/                # axios client
|   |   |-- components/
|   |   |-- pages/
|   |   `-- styles/
|   |-- Dockerfile
|   `-- package.json
`-- docker-compose.yml
```

## Quick Start (Docker, recommended)

### 1. Configure credentials

Edit `docker-compose.yml` and replace `your_password` in:

- `POSTGRES_PASSWORD`
- `DATABASE_URL`

### 2. Start all services

```bash
docker compose up --build
```

### 3. Open apps

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

Default ports from compose:

- Postgres: `5433` (mapped to container `5432`)
- Backend: `8000`
- Frontend: `5173`

## Run Without Docker

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Expected environment variables (can be stored in `backend/.env`):

- `DATABASE_URL` (example: `postgresql+psycopg2://user:password@localhost:5432/wecupmus`)
- `SECRET_KEY`
- `ALGORITHM` (default: `HS256`)
- `ACCESS_TOKEN_EXPIRE_MINUTES`

## Frontend

```bash
cd frontend
npm install
npm run dev -- --host
```

Frontend API base URL is configured in `frontend/src/api/axios.js` and points to:

- `http://localhost:8000/api/v1`

## API Modules

All routes are prefixed with ` /api/v1 `.

- `auth`
  - `POST /auth/login`
- `users`
  - `POST /users/`
  - `GET /users/me`
  - `DELETE /users/me`
- `profiles`
  - `POST /profiles/`
  - `GET /profiles/me`
  - `GET /profiles/me/preferences`
  - `PATCH /profiles/me`
  - `GET /profiles/me/status`
  - `GET /profiles/user/{user_id}`
  - `GET /profiles/match`
  - `GET /profiles/search`
- `matches`
  - `POST /matches/like`
  - `POST /matches/skip`
  - `GET /matches/mutual`
  - `GET /matches/history`
- `messages`
  - `GET /messages/{other_user_id}`
  - `POST /messages/`
  - `GET /messages/clubs/{club_id}`
  - `POST /messages/clubs/{club_id}`
- `clubs`
  - `GET /clubs/`
  - `POST /clubs/`
  - `GET /clubs/{club_id}`
  - `GET /clubs/users/search`
  - `POST /clubs/{club_id}/invite`
  - `GET /clubs/invites/me`
  - `POST /clubs/invites/{invite_id}/accept`
  - `POST /clubs/invites/{invite_id}/decline`
- `events`
  - `GET /events/`
  - `POST /events/`
  - `GET /events/{event_id}`
  - `DELETE /events/{event_id}`
- `rides`
  - `GET /rides/`
  - `POST /rides/`
  - `POST /rides/{ride_id}/join`
  - `POST /rides/{ride_id}/leave`
  - `DELETE /rides/{ride_id}`
- `plan`
  - `GET /plan/`
  - `POST /plan/`
  - `POST /plan/{meeting_id}/join`
  - `POST /plan/{meeting_id}/leave`
  - `DELETE /plan/{meeting_id}`
- `market`
  - `GET /market/`
  - `POST /market/`
  - `GET /market/{item_id}`
  - `PATCH /market/{item_id}`
  - `DELETE /market/{item_id}`

Use `http://localhost:8000/docs` for interactive request/response schemas.

## Notes

- On startup backend runs DB initialization and ensures `vector` extension exists.
- Backend also creates static folder for club avatars under `backend/app/static/club_avatars`.
- CORS is currently open (`allow_origins=["*"]`) for development convenience.

## Troubleshooting

- If backend cannot connect to DB:
  - verify credentials in `docker-compose.yml`
  - verify Postgres container is healthy and port mapping is not occupied
- If frontend cannot reach backend:
  - ensure backend runs on `localhost:8000`
  - check `frontend/src/api/axios.js` base URL
- If ML dependencies are slow to install:
  - first build can take longer because `sentence-transformers` downloads heavy dependencies
