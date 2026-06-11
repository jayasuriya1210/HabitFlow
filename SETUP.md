# HabitFlow Setup

## Prerequisites

- Node.js 14+
- MongoDB running locally
- Port 5001 available

## Start MongoDB

```bash
mongod
```

## Start the App

```bash
npm install
npm start
```

Then open `http://localhost:5001`.

## What You Should See

- Login screen first
- Dark mode toggle
- Habit dashboard after sign-in

## Troubleshooting

- If login fails, check that MongoDB is running.
- If the dashboard stays hidden, refresh the page and sign in again.
- If the server will not start, confirm port 5001 is free.
