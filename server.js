// HabitFlow Backend - Express Server with MongoDB
// ===============================================

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Database module
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from root directory

function getSessionToken(req) {
    const headerToken = req.get('x-session-token');
    if (headerToken) {
        return headerToken;
    }

    const authHeader = req.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    return null;
}

async function requireAuth(req, res, next) {
    try {
        const token = getSessionToken(req);
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const user = await db.getUserBySessionToken(token);
        if (!user) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        req.authUser = user;
        req.sessionToken = token;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Failed to authenticate request' });
    }
}

// AUTH - Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const result = await db.createUser(req.body);
        const loginResult = await db.authenticateUser(req.body);

        res.status(201).json({
            message: 'Account created successfully',
            user: loginResult.user,
            sessionToken: loginResult.sessionToken
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(400).json({ error: error.message || 'Failed to create account' });
    }
});

// AUTH - Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const result = await db.authenticateUser(req.body);
        res.json({
            message: 'Login successful',
            user: result.user,
            sessionToken: result.sessionToken
        });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(400).json({ error: error.message || 'Failed to log in' });
    }
});

// AUTH - Current session
app.get('/api/auth/me', requireAuth, async (req, res) => {
    res.json({
        success: true,
        user: req.authUser
    });
});

// AUTH - Logout
app.post('/api/auth/logout', requireAuth, async (req, res) => {
    try {
        await db.clearSession(req.sessionToken);
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Error logging out user:', error);
        res.status(500).json({ error: 'Failed to log out' });
    }
});

// CREATE - Add new habit
app.post('/api/habits', requireAuth, async (req, res) => {
    try {
        const result = await db.createHabit(req.body, req.authUser);
        res.status(201).json({
            message: 'Habit created successfully',
            habitId: result.habitId,
            habit: result.habit
        });
    } catch (error) {
        console.error('Error creating habit:', error);
        res.status(400).json({ error: error.message || 'Failed to create habit' });
    }
});

// READ - Get all habits
app.get('/api/habits', requireAuth, async (req, res) => {
    try {
        const category = req.query.category;
        const result = await db.getAllHabits(req.authUser.id, category);
        res.json(result);
    } catch (error) {
        console.error('Error fetching habits:', error);
        res.status(500).json({ error: 'Failed to fetch habits' });
    }
});

// READ - Get single habit
app.get('/api/habits/:id', requireAuth, async (req, res) => {
    try {
        const result = await db.getHabitById(req.params.id, req.authUser.id);
        res.json(result);
    } catch (error) {
        console.error('Error fetching habit:', error);
        res.status(error.message.includes('Invalid') ? 400 : 404)
            .json({ error: error.message || 'Failed to fetch habit' });
    }
});

// UPDATE - Update habit details
app.put('/api/habits/:id', requireAuth, async (req, res) => {
    try {
        const result = await db.updateHabit(req.params.id, req.body, req.authUser.id);
        res.json({
            message: 'Habit updated successfully',
            ...result
        });
    } catch (error) {
        console.error('Error updating habit:', error);
        res.status(error.message.includes('Invalid') ? 400 : 404)
            .json({ error: error.message || 'Failed to update habit' });
    }
});

// UPDATE - Complete habit (mark as done today)
app.post('/api/habits/:id/complete', requireAuth, async (req, res) => {
    try {
        const result = await db.completeHabit(req.params.id, req.authUser.id);
        res.json({
            message: 'Habit completed successfully',
            ...result
        });
    } catch (error) {
        console.error('Error completing habit:', error);
        res.status(error.message.includes('Invalid') ? 400 : 404)
            .json({ error: error.message || 'Failed to complete habit' });
    }
});

// DELETE - Delete habit
app.delete('/api/habits/:id', requireAuth, async (req, res) => {
    try {
        const result = await db.deleteHabit(req.params.id, req.authUser.id);
        res.json({
            message: 'Habit deleted successfully',
            ...result
        });
    } catch (error) {
        console.error('Error deleting habit:', error);
        res.status(error.message.includes('Invalid') ? 400 : 404)
            .json({ error: error.message || 'Failed to delete habit' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date() });
});

// STATISTICS - Get stats
app.get('/api/stats', requireAuth, async (req, res) => {
    try {
        const result = await db.getStats(req.authUser.id);
        res.json(result);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
    try {
        // Connect to database
        const connected = await db.connectDB();
        if (!connected) {
            throw new Error('Failed to connect to MongoDB');
        }

        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════╗
║     🎯 HabitFlow Server Running    ║
╠════════════════════════════════════╣
║ 📍 URL: http://localhost:${PORT}        
║ 🗄️  Database: ${db.DB_NAME}
║ 📦 Collections: ${db.COLLECTION_NAME}, ${db.USERS_COLLECTION_NAME}
║ 🔗 MongoDB: ${db.MONGO_URI}
╚════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⏹️  Shutting down server...');
    await db.closeDB();
    process.exit(0);
});

startServer();
