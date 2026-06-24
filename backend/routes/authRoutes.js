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

const db = require('../config/db');
router.get('/debug-tasks', async (req, res) => {
  try {
    const judgeId = req.query.judgeId;
    if (!judgeId) {
      const [judges] = await db.query("SELECT id, username, fullname FROM users WHERE role = 'judge' LIMIT 10");
      return res.json({ error: 'Missing judgeId query param', available_judges: judges });
    }

    const [activities] = await db.query(
      `SELECT a.id, a.title, a.description, a.status, a.scoring_algorithm, a.criteria, aj.is_head_judge
       FROM activities a
       JOIN activity_judges aj ON a.id = aj.activity_id
       WHERE aj.judge_id = ? AND a.status IN ('Active', 'Completed', 'Archived')
       ORDER BY a.start_date DESC`,
      [judgeId]
    );

    const tasks = [];
    for (const act of activities) {
      // Get participants
      const [participants] = await db.query(
        'SELECT id, name, type, institution_code, institution_name, project_title, team_members, project_url, attachment_url, department, level, year, advisors FROM participants WHERE activity_id = ?',
        [act.id]
      );

      // Get scores submitted by this judge for this activity
      const [submittedScores] = await db.query(
        'SELECT participant_id, total_score, submitted_at FROM transaction_scores WHERE activity_id = ? AND judge_id = ?',
        [act.id, judgeId]
      );

      tasks.push({
        id: act.id,
        title: act.title,
        participantsCount: participants.length,
        submittedScoresCount: submittedScores.length
      });
    }

    res.json({ success: true, tasks });
  } catch (error) {
    res.json({ success: false, error: error.message, stack: error.stack });
  }
});

router.get('/debug-history', async (req, res) => {
  try {
    const judgeId = req.query.judgeId;
    if (!judgeId) {
      return res.json({ error: 'Missing judgeId query param' });
    }

    const [rows] = await db.query(
      `SELECT ts.id, ts.activity_id, ts.total_score, ts.submitted_at, ts.scores,
       a.title as activity_title, p.name as participant_name
       FROM transaction_scores ts
       JOIN activities a ON ts.activity_id = a.id
       JOIN participants p ON ts.participant_id = p.id
       WHERE ts.judge_id = ?
       ORDER BY ts.submitted_at DESC`,
      [judgeId]
    );

    const history = rows.map(r => ({
      ...r,
      scores: typeof r.scores === 'string' ? JSON.parse(r.scores) : r.scores
    }));

    res.json({ success: true, history });
  } catch (error) {
    res.json({ success: false, error: error.message, stack: error.stack });
  }
});

module.exports = router;
