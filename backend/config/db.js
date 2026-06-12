// HabitFlow Database Configuration
// ==================================

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/';
const DB_NAME = process.env.DB_NAME || 'habitflow';
const COLLECTION_NAME = 'habits';
const USERS_COLLECTION_NAME = 'users';

let client;
let db;

/**
 * Initialize MongoDB connection
 */
async function connectDB() {
    try {
        client = new MongoClient(MONGO_URI);
        await client.connect();
        console.log('✅ Connected to MongoDB');

        db = client.db(DB_NAME);

        // Create indexes for better query performance
        await db.collection(COLLECTION_NAME).createIndex({ userId: 1, category: 1 });
        await db.collection(COLLECTION_NAME).createIndex({ userId: 1, createdDate: 1 });
        await db.collection(COLLECTION_NAME).createIndex({ userId: 1, updatedAt: -1 });
        await db.collection(USERS_COLLECTION_NAME).createIndex({ username: 1 }, { unique: true });

        console.log(`✅ Using database: ${DB_NAME}`);
        console.log(`✅ Using collections: ${COLLECTION_NAME}, ${USERS_COLLECTION_NAME}`);

        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}

/**
 * Close database connection
 */
async function closeDB() {
    if (client) {
        await client.close();
        console.log('✅ Database connection closed');
    }
}

/**
 * Check if database is connected
 */
function isConnected() {
    return client && db;
}

function getDb() {
    return db;
}

function getUsersCollection() {
    if (!db) throw new Error('Database not connected');
    return db.collection(USERS_COLLECTION_NAME);
}

function getHabitsCollection() {
    if (!db) throw new Error('Database not connected');
    return db.collection(COLLECTION_NAME);
}

module.exports = {
    connectDB,
    closeDB,
    isConnected,
    getDb,
    getUsersCollection,
    getHabitsCollection,
    MONGO_URI,
    DB_NAME,
    COLLECTION_NAME,
    USERS_COLLECTION_NAME
};
