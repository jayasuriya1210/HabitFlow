const habitService = require('../services/habitService');

async function createHabit(req, res) {
    try {
        const result = await habitService.createHabit(req.body, req.authUser);
        res.status(201).json({
            message: 'Habit created successfully',
            habitId: result.habitId,
            habit: result.habit
        });
    } catch (error) {
        console.error('Error creating habit:', error);
        res.status(400).json({ error: error.message || 'Failed to create habit' });
    }
}

async function getAllHabits(req, res) {
    try {
        const category = req.query.category;
        const result = await habitService.getAllHabits(req.authUser.id, category);
        res.json(result);
    } catch (error) {
        console.error('Error fetching habits:', error);
        res.status(500).json({ error: 'Failed to fetch habits' });
    }
}

async function getHabitById(req, res) {
    try {
        const result = await habitService.getHabitById(req.params.id, req.authUser.id);
        res.json(result);
    } catch (error) {
        console.error('Error fetching habit:', error);
        res.status(error.message.includes('Invalid') ? 400 : 404)
            .json({ error: error.message || 'Failed to fetch habit' });
    }
}

async function updateHabit(req, res) {
    try {
        const result = await habitService.updateHabit(req.params.id, req.body, req.authUser.id);
        res.json({
            message: 'Habit updated successfully',
            ...result
        });
    } catch (error) {
        console.error('Error updating habit:', error);
        res.status(error.message.includes('Invalid') ? 400 : 404)
            .json({ error: error.message || 'Failed to update habit' });
    }
}

async function completeHabit(req, res) {
    try {
        const result = await habitService.completeHabit(req.params.id, req.authUser.id);
        res.json({
            message: 'Habit completed successfully',
            ...result
        });
    } catch (error) {
        console.error('Error completing habit:', error);
        res.status(error.message.includes('Invalid') ? 400 : 404)
            .json({ error: error.message || 'Failed to complete habit' });
    }
}

async function deleteHabit(req, res) {
    try {
        const result = await habitService.deleteHabit(req.params.id, req.authUser.id);
        res.json({
            message: 'Habit deleted successfully',
            ...result
        });
    } catch (error) {
        console.error('Error deleting habit:', error);
        res.status(error.message.includes('Invalid') ? 400 : 404)
            .json({ error: error.message || 'Failed to delete habit' });
    }
}

module.exports = {
    createHabit,
    getAllHabits,
    getHabitById,
    updateHabit,
    completeHabit,
    deleteHabit
};
