# HabitFlow Database

## Collections

- `habits`
- `users`

## `habits`

```javascript
{
  _id: ObjectId,
  userId: String,
  ownerUsername: String,
  name: String,
  category: String,
  description: String,
  goal: Number,
  createdDate: String,
  completedDates: Array,
  totalCompleted: Number,
  updatedAt: Date
}
```

## `users`

```javascript
{
  _id: ObjectId,
  username: String,
  passwordSalt: String,
  passwordHash: String,
  sessionToken: String,
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date
}
```

## Indexes

- `habits.userId + category`
- `habits.userId + createdDate`
- `users.username`
- `users.sessionToken`

