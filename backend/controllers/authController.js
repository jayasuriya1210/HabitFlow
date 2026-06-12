const userService = require('../services/userService');

async function register(req, res) {
    try {
        await userService.createUser(req.body);
        const loginResult = await userService.authenticateUser(req.body);

        res.status(201).json({
            message: 'Account created successfully',
            user: loginResult.user,
            accessToken: loginResult.accessToken,
            sessionToken: loginResult.accessToken
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(400).json({ error: error.message || 'Failed to create account' });
    }
}

async function login(req, res) {
    try {
        const result = await userService.authenticateUser(req.body);
        res.json({
            message: 'Login successful',
            user: result.user,
            accessToken: result.accessToken,
            sessionToken: result.accessToken
        });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(400).json({ error: error.message || 'Failed to log in' });
    }
}

async function me(req, res) {
    res.json({
        success: true,
        user: req.authUser
    });
}

async function logout(req, res) {
    try {
        await userService.clearSession(req.sessionToken);
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Error logging out user:', error);
        res.status(500).json({ error: 'Failed to log out' });
    }
}

module.exports = {
    register,
    login,
    me,
    logout
};
