const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const habitRoutes = require('./routes/habitRoutes');
const statsRoutes = require('./routes/statsRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date() });
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
