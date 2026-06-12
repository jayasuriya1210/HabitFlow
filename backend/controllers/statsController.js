const habitService = require('../services/habitService');

async function getStats(req, res) {
    try {
        const result = await habitService.getStats(req.authUser.id);
        res.json(result);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
}

module.exports = {
    getStats
};
