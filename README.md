# HabitFlow

A habit tracking app built with Node.js, Express, MongoDB, and a responsive UI.

## Features

- Habit CRUD
- Account login and registration with JWT auth
- Per-user habit data
- Dark mode
- Responsive layout

## Getting Started

```bash
npm install
npm start
```

Open `http://localhost:5001`.

## Environment Variables

Create a `.env` file with:

```bash
PORT=5001
MONGO_URI=mongodb://localhost:27017/
DB_NAME=habitflow
JWT_SECRET=your-long-random-secret
```

## API

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Authentication uses a signed JWT returned as `accessToken` and sent in the `Authorization: Bearer <token>` header.

### Habits

- `POST /api/habits`
- `GET /api/habits`
- `GET /api/habits/:id`
- `PUT /api/habits/:id`
- `POST /api/habits/:id/complete`
- `DELETE /api/habits/:id`

### Other

- `GET /api/stats`
- `GET /api/health`

## Database

- `habits`
- `users`

## Notes

- Habits are scoped to the signed-in user.
- Passwords are stored hashed with a salt.
- JWTs are signed on the server and validated on each authenticated request.
