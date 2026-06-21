const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/authMiddleware');
const {
  getDashboardStats,
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  cloneActivity,
  deleteActivity,
  getJudges,
  createJudge,
  updateJudgeStatus,
  resetJudgePassword,
  updateJudge,
  deleteJudge,
  addParticipant,
  deleteParticipant,
  assignJudges,
  getSystemSettings,
  updateSystemSettings
} = require('../controllers/adminController');

// All routes here require admin privileges
router.use(protect, isAdmin);

router.get('/dashboard', getDashboardStats);
router.route('/activities')
  .get(getActivities)
  .post(createActivity);

router.route('/activities/:id')
  .get(getActivityById)
  .put(updateActivity)
  .delete(deleteActivity);

router.post('/activities/:id/clone', cloneActivity);
router.post('/activities/:id/participants', addParticipant);
router.post('/activities/:id/judges', assignJudges);

router.route('/judges')
  .get(getJudges)
  .post(createJudge);

router.route('/judges/:id')
  .put(updateJudge)
  .delete(deleteJudge);

router.put('/judges/:id/status', updateJudgeStatus);
router.put('/judges/:id/reset-password', resetJudgePassword);

const upload = require('../middleware/uploadMiddleware');

router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('กรุณาเลือกไฟล์ภาพที่ต้องการอัปโหลด');
  }
  res.json({
    url: `/api/uploads/${req.file.filename}`,
    filename: req.file.filename
  });
});

router.delete('/participants/:id', deleteParticipant);

router.route('/settings')
  .get(getSystemSettings)
  .put(updateSystemSettings);

module.exports = router;
