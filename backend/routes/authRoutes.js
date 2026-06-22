const express = require('express');
const router = express.Router();
const { loginUser, getMe, getPublicActivity, debugDb } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.get('/activities/public/:id', getPublicActivity);
router.get('/debug-db', debugDb);

module.exports = router;
