const express = require('express');
const router = express.Router();
const { protect, isJudge } = require('../middleware/authMiddleware');
const { getMyTasks, submitScore, getMyHistory } = require('../controllers/judgeController');

// All routes here require judge privilege
router.use(protect, isJudge);

router.get('/tasks', getMyTasks);
router.post('/scores', submitScore);
router.get('/history', getMyHistory);

module.exports = router;
