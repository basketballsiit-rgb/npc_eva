const express = require('express');
const router = express.Router();
const { loginUser, getMe, getPublicActivity } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.get('/activities/public/:id', getPublicActivity);

module.exports = router;
