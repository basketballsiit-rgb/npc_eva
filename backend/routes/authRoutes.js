const express = require('express');
const router = express.Router();
const { loginUser, getMe, getPublicActivity, registerParticipantPublic, getPublicSettings } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.get('/settings', getPublicSettings);
router.get('/activities/public/:id', getPublicActivity);
router.post('/activities/public/:id/register', upload.single('attachment'), registerParticipantPublic);

module.exports = router;
