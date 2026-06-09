// HabitFlow Database Configuration
// ==================================

const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');
require('dotenv').config();

// MongoDB Configuration
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/';
const DB_NAME = process.env.DB_NAME || 'habitflow';
const COLLECTION_NAME = 'habits';
const USERS_COLLECTION_NAME = 'users';

let client;
let db;
let habitsCollection;
let usersCollection;

// ==================== HELPERS ====================

function normalizeUsername(username) {
    return String(username || '').trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return { salt, hash };
}

function verifyPassword(password, passwordSalt, passwordHash) {
    const { hash } = hashPassword(password, passwordSalt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(passwordHash, 'hex'));
}

function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

function toPublicUser(user) {
    if (!user) {
        return null;
    }

    return {
        id: user._id.toString(),
        username: user.username,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt || null
    };
}

function toHabitDocument(habit) {
    if (!habit) {
        return null;
    }

    return {
        ...habit,
        id: habit._id.toString(),
        _id: habit._id.toString(),
        userId: habit.userId || null
    };
}

function requireAuthOwner(owner) {
    if (!owner || !owner.id || !owner.username) {
        throw new Error('Authentication required');
    }

    return owner;
}

// ==================== DATABASE CONNECTION ====================

/**
 * Initialize MongoDB connection
 */
async function connectDB() {
    try {
        client = new MongoClient(MONGO_URI);
        await client.connect();
        console.log('✅ Connected to MongoDB');

        db = client.db(DB_NAME);
        habitsCollection = db.collection(COLLECTION_NAME);
        usersCollection = db.collection(USERS_COLLECTION_NAME);

        // Create indexes for better query performance
        await habitsCollection.createIndex({ userId: 1, category: 1 });
        await habitsCollection.createIndex({ userId: 1, createdDate: 1 });
        await habitsCollection.createIndex({ userId: 1, updatedAt: -1 });
        await usersCollection.createIndex({ username: 1 }, { unique: true });
        await usersCollection.createIndex({ sessionToken: 1 }, { sparse: true });

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
    return client && db && habitsCollection && usersCollection;
}

// ==================== AUTH OPERATIONS ====================

async function createUser(userData) {
    try {
        const username = normalizeUsername(userData.username);
        const password = String(userData.password || '');

        if (!username || !password) {
            throw new Error('Username and password are required');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        const existingUser = await usersCollection.findOne({ username });
        if (existingUser) {
            throw new Error('Username already exists');
        }

        const { salt, hash } = hashPassword(password);
        const now = new Date();

        const user = {
            username,
            passwordSalt: salt,
            passwordHash: hash,
            sessionToken: null,
            createdAt: now,
            updatedAt: now,
            lastLoginAt: null
        };

        const result = await usersCollection.insertOne(user);
        return {
            success: true,
            user: toPublicUser({ _id: result.insertedId, ...user })
        };
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

async function authenticateUser(userData) {
    try {
        const username = normalizeUsername(userData.username);
        const password = String(userData.password || '');

        if (!username || !password) {
            throw new Error('Username and password are required');
        }

        const user = await usersCollection.findOne({ username });
        if (!user) {
            throw new Error('Invalid username or password');
        }

        const passwordMatches = verifyPassword(password, user.passwordSalt, user.passwordHash);
        if (!passwordMatches) {
            throw new Error('Invalid username or password');
        }

        const sessionToken = generateSessionToken();
        const now = new Date();

        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    sessionToken,
                    lastLoginAt: now,
                    updatedAt: now
                }
            }
        );

        return {
            success: true,
            sessionToken,
            user: toPublicUser({
                ...user,
                sessionToken,
                lastLoginAt: now,
                updatedAt: now
            })
        };
    } catch (error) {
        console.error('Error authenticating user:', error);
        throw error;
    }
}

async function getUserBySessionToken(sessionToken) {
    try {
        if (!sessionToken) {
            return null;
        }

        const user = await usersCollection.findOne({ sessionToken });
        return user ? toPublicUser(user) : null;
    } catch (error) {
        console.error('Error fetching authenticated user:', error);
        throw error;
    }
}

async function clearSession(sessionToken) {
    try {
        if (!sessionToken) {
            return { success: true };
        }

        await usersCollection.updateOne(
            { sessionToken },
            {
                $set: {
                    sessionToken: null,
                    updatedAt: new Date()
                }
            }
        );

        return { success: true };
    } catch (error) {
        console.error('Error clearing session:', error);
        throw error;
    }
}

// ==================== CRUD OPERATIONS ====================

/**
 * CREATE - Add new habit
 */
async function createHabit(habitData, owner) {
    try {
        const authOwner = requireAuthOwner(owner);
        const { name, category, description, goal } = habitData;

        if (!name || !category || !goal) {
            throw new Error('Missing required fields: name, category, goal');
        }

        const habit = {
            userId: authOwner.id,
            ownerUsername: authOwner.username,
            name,
            category,
            description,
            goal: parseInt(goal, 10),
            createdDate: new Date().toISOString().split('T')[0],
            completedDates: [],
            totalCompleted: 0,
            updatedAt: new Date()
        };

        const result = await habitsCollection.insertOne(habit);
        const savedHabit = { _id: result.insertedId, ...habit };

        return {
            success: true,
            habitId: result.insertedId,
            habit: toHabitDocument(savedHabit)
        };
    } catch (error) {
        console.error('Error creating habit:', error);
        throw error;
    }
}

/**
 * READ - Get all habits with optional filtering
 */
async function getAllHabits(userId, category = null) {
    try {
        const query = { userId };
        if (category && category !== 'all') {
            query.category = category;
        }

        const habits = await habitsCollection.find(query).toArray();

        return {
            success: true,
            count: habits.length,
            habits: habits.map(toHabitDocument)
        };
    } catch (error) {
        console.error('Error fetching habits:', error);
        throw error;
    }
}

/**
 * READ - Get single habit by ID
 */
async function getHabitById(id, userId) {
    try {
        if (!ObjectId.isValid(id)) {
            throw new Error('Invalid habit ID');
        }

        const habit = await habitsCollection.findOne({
            _id: new ObjectId(id),
            userId
        });

        if (!habit) {
            throw new Error('Habit not found');
        }

        return {
            success: true,
            ...toHabitDocument(habit)
        };
    } catch (error) {
        console.error('Error fetching habit:', error);
        throw error;
    }
}

/**
 * UPDATE - Update habit details
 */
async function updateHabit(id, updateData, userId) {
    try {
        if (!ObjectId.isValid(id)) {
            throw new Error('Invalid habit ID');
        }

        const { name, category, description, goal } = updateData;

        if (!name || !category || !goal) {
            throw new Error('Missing required fields: name, category, goal');
        }

        const update = {
            name,
            category,
            description,
            goal: parseInt(goal, 10),
            updatedAt: new Date()
        };

        const result = await habitsCollection.findOneAndUpdate(
            { _id: new ObjectId(id), userId },
            { $set: update },
            { returnDocument: 'after' }
        );

        if (!result.value) {
            throw new Error('Habit not found');
        }

        return {
            success: true,
            ...toHabitDocument(result.value)
        };
    } catch (error) {
        console.error('Error updating habit:', error);
        throw error;
    }
}

/**
 * UPDATE - Complete habit (mark as done today)
 */
async function completeHabit(id, userId) {
    try {
        if (!ObjectId.isValid(id)) {
            throw new Error('Invalid habit ID');
        }

        const today = new Date().toISOString().split('T')[0];

        const habit = await habitsCollection.findOne({
            _id: new ObjectId(id),
            userId
        });

        if (!habit) {
            throw new Error('Habit not found');
        }

        if (habit.completedDates.includes(today)) {
            throw new Error('Habit already completed today');
        }

        const result = await habitsCollection.findOneAndUpdate(
            { _id: new ObjectId(id), userId },
            {
                $push: { completedDates: today },
                $inc: { totalCompleted: 1 },
                $set: { updatedAt: new Date() }
            },
            { returnDocument: 'after' }
        );

        return {
            success: true,
            ...toHabitDocument(result.value)
        };
    } catch (error) {
        console.error('Error completing habit:', error);
        throw error;
    }
}

/**
 * DELETE - Delete habit by ID
 */
async function deleteHabit(id, userId) {
    try {
        if (!ObjectId.isValid(id)) {
            throw new Error('Invalid habit ID');
        }

        const result = await habitsCollection.findOneAndDelete({
            _id: new ObjectId(id),
            userId
        });

        if (!result.value) {
            throw new Error('Habit not found');
        }

        return {
            success: true,
            deletedHabit: toHabitDocument(result.value)
        };
    } catch (error) {
        console.error('Error deleting habit:', error);
        throw error;
    }
}

// ==================== STATISTICS ====================

/**
 * Get dashboard statistics
 */
async function getStats(userId) {
    try {
        const today = new Date().toISOString().split('T')[0];

        const habits = await habitsCollection.find({ userId }).toArray();
        const totalHabits = habits.length;
        const completedToday = habits.filter((h) => h.completedDates.includes(today)).length;
        const progress = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

        const statsByCategory = {};
        habits.forEach((habit) => {
            if (!statsByCategory[habit.category]) {
                statsByCategory[habit.category] = { total: 0, completedToday: 0 };
            }
            statsByCategory[habit.category].total++;
            if (habit.completedDates.includes(today)) {
                statsByCategory[habit.category].completedToday++;
            }
        });

        return {
            success: true,
            totalHabits,
            completedToday,
            todayProgress: `${progress}%`,
            statsByCategory
        };
    } catch (error) {
        console.error('Error fetching stats:', error);
        throw error;
    }
}

// ==================== EXPORTS ====================

module.exports = {
    // Connection
    connectDB,
    closeDB,
    isConnected,

    // Auth
    createUser,
    authenticateUser,
    getUserBySessionToken,
    clearSession,

    // CRUD
    createHabit,
    getAllHabits,
    getHabitById,
    updateHabit,
    completeHabit,
    deleteHabit,

    // Statistics
    getStats,

    // Configuration
    MONGO_URI,
    DB_NAME,
    COLLECTION_NAME,
    USERS_COLLECTION_NAME
};
