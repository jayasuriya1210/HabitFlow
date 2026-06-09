# HabitFlow

A habit tracking app built with Node.js, Express, MongoDB, and a responsive UI.

## Features

- Habit CRUD
- Account login and registration
- Per-user habit data
- Dark mode
- Responsive layout

## Getting Started

```bash
npm install
npm start
```

Open `http://localhost:5000`.

## API

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

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

