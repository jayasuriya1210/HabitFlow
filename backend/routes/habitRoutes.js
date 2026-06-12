const express = require('express');
const router = express.Router();
const habitController = require('../controllers/habitController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth); // All habit routes require auth

router.post('/', habitController.createHabit);
router.get('/', habitController.getAllHabits);
router.get('/:id', habitController.getHabitById);
router.put('/:id', habitController.updateHabit);
router.post('/:id/complete', habitController.completeHabit);
router.delete('/:id', habitController.deleteHabit);

module.exports = router;
