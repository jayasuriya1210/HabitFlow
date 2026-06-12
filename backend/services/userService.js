const { ObjectId } = require('mongodb');
const { getUsersCollection } = require('../config/db');
const { normalizeUsername, hashPassword, verifyPassword } = require('../utils/crypto');
const { issueAuthToken, verifyJwt } = require('../utils/jwt');

function toPublicUser(user) {
    if (!user) return null;
    return {
        id: user._id.toString(),
        username: user.username,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt || null
    };
}

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

        const usersCollection = getUsersCollection();
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
            tokenVersion: 0,
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

        const usersCollection = getUsersCollection();
        const user = await usersCollection.findOne({ username });
        if (!user) {
            throw new Error('Invalid username or password');
        }

        const passwordMatches = verifyPassword(password, user.passwordSalt, user.passwordHash);
        if (!passwordMatches) {
            throw new Error('Invalid username or password');
        }

        const now = new Date();
        const updatedUserResult = await usersCollection.findOneAndUpdate(
            { _id: user._id },
            {
                $inc: { tokenVersion: 1 },
                $set: {
                    lastLoginAt: now,
                    updatedAt: now
                }
            },
            { returnDocument: 'after' }
        );

        // FindOneAndUpdate returns { value: doc } in MongoDB driver v4/v5/v6 or the doc directly depending on configuration/version
        // In the original file it was: const updatedUser = updatedUserResult.value || ...
        const updatedUser = updatedUserResult.value || updatedUserResult || {
            ...user,
            tokenVersion: Number(user.tokenVersion || 0) + 1,
            lastLoginAt: now,
            updatedAt: now
        };

        return {
            success: true,
            accessToken: issueAuthToken(updatedUser),
            user: toPublicUser(updatedUser)
        };
    } catch (error) {
        console.error('Error authenticating user:', error);
        throw error;
    }
}

async function getUserBySessionToken(sessionToken) {
    if (!sessionToken) return null;

    try {
        const payload = verifyJwt(sessionToken);
        if (!payload || !payload.sub || !ObjectId.isValid(payload.sub)) {
            return null;
        }

        const usersCollection = getUsersCollection();
        const user = await usersCollection.findOne({ _id: new ObjectId(payload.sub) });
        if (!user) return null;

        if (Number(user.tokenVersion || 0) !== Number(payload.tv || 0)) {
            return null;
        }

        return toPublicUser(user);
    } catch (error) {
        if (
            error.message === 'Authentication required' ||
            error.message === 'Invalid authentication token' ||
            error.message === 'Authentication token expired'
        ) {
            return null;
        }
        console.error('Error fetching authenticated user:', error);
        throw error;
    }
}

async function clearSession(sessionToken) {
    if (!sessionToken) return { success: true };

    try {
        const payload = verifyJwt(sessionToken);
        if (!payload || !payload.sub || !ObjectId.isValid(payload.sub)) {
            return { success: true };
        }

        const usersCollection = getUsersCollection();
        await usersCollection.updateOne(
            {
                _id: new ObjectId(payload.sub),
                tokenVersion: Number(payload.tv || 0)
            },
            {
                $inc: { tokenVersion: 1 },
                $set: { updatedAt: new Date() }
            }
        );
        return { success: true };
    } catch (error) {
        if (
            error.message === 'Authentication required' ||
            error.message === 'Invalid authentication token' ||
            error.message === 'Authentication token expired'
        ) {
            return { success: true };
        }
        console.error('Error clearing session:', error);
        throw error;
    }
}

module.exports = {
    createUser,
    authenticateUser,
    getUserBySessionToken,
    clearSession,
    toPublicUser
};
