const userService = require('../services/userService');

function getSessionToken(req) {
    const authHeader = req.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7).trim();
    }

    const headerToken = req.get('x-session-token');
    if (headerToken) {
        return headerToken;
    }

    return null;
}

async function requireAuth(req, res, next) {
    try {
        const token = getSessionToken(req);
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const user = await userService.getUserBySessionToken(token);
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

module.exports = {
    requireAuth
};
