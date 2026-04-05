# Smart Parking

This repository contains the Smart Parking web application with a React frontend and an Express backend backed by SQLite.

## Project overview

- Frontend: React + TypeScript + Vite
- Backend: Express.js + SQLite
- Authentication: email/password signup and login with JWT-based session persistence
- Docker Compose: runs both `web` and `api` services together

## Quick start for developers

### Option 1: Run everything with Docker Compose

From the repo root:

```bash
docker compose up
```

Then open the app in your browser:

```bash
http://localhost:5173
```

The backend API will be available at:

```bash
http://localhost:4000
```

### Option 2: Run locally without Docker

#### 1. Install dependencies

From the repository root:

```bash
npm install
```

Then install backend dependencies:

```bash
cd server
npm install
```

#### 2. Start the backend

From the `server` folder:

```bash
npm start
```

The backend listens on:

```bash
http://localhost:4000
```

#### 3. Start the frontend

Back in the repository root:

```bash
npm run dev
```

Then open:

```bash
http://localhost:5173
```

## API endpoints

- `POST /api/signup` — create a new user
  - payload: `{ email, password, dob, phone }`
- `POST /api/login` — sign in with email and password
  - payload: `{ email, password }`
- `GET /api/me` — get the current authenticated user
  - requires `Authorization: Bearer <token>` header

## Notes for developers

- The frontend stores the login token in `localStorage` under `smart_parking_token`.
- The backend uses `server/db.sqlite` for persistent storage.
- The Docker Compose config mounts local files into containers for live development.
- If you change backend environment values, update `docker-compose.yml` accordingly.

## Development workflow

1. Make changes in `src/` for the frontend.
2. Make backend changes in `server/`.
3. Use the browser and network inspector to verify API requests go to `/api/*`.
4. Use `docker compose down` to stop the development environment.

## Recommended next steps

- Add a protected parking dashboard after login
- Add form validation for phone and password strength
- Add a dedicated profile page route
