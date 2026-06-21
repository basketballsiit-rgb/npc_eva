const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getLeaderboard } = require('../controllers/reportController');

// Requires authentication
router.get('/leaderboard/:activityId', protect, getLeaderboard);

module.exports = router;
