const express = require('express');
const router = express.Router();
const path = require('path');
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
    const name = req.query.name;
    if (name) {
      const [judges] = await db.query("SELECT id, username, fullname, role, status, institution_code FROM users WHERE fullname LIKE ?", [`%${name}%`]);
      return res.json({ search: name, results: judges });
    }
    if (!judgeId) {
      const [judges] = await db.query("SELECT id, username, fullname, role, status FROM users");
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

      // Map participants with submission status
      const participantStatusList = participants.map(part => {
        const submission = submittedScores.find(s => s.participant_id === part.id);
        return {
          id: part.id,
          name: part.name,
          institution_code: part.institution_code,
          institution_name: part.institution_name,
          project_title: part.project_title,
          team_members: part.team_members,
          project_url: part.project_url,
          attachment_url: part.attachment_url,
          department: part.department,
          level: part.level,
          year: part.year,
          advisors: part.advisors,
          evaluated: !!submission,
          total_score: submission ? parseFloat(submission.total_score) : null,
          submitted_at: submission ? submission.submitted_at : null
        };
      });

      tasks.push({
        id: act.id,
        title: act.title,
        description: act.description,
        status: act.status,
        scoring_algorithm: act.scoring_algorithm,
        criteria: typeof act.criteria === 'string' ? JSON.parse(act.criteria) : act.criteria,
        is_head_judge: act.is_head_judge !== null && act.is_head_judge !== undefined ? parseInt(act.is_head_judge, 10) : 0,
        participants: participantStatusList
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

const fs = require('fs');
const os = require('os');
router.get('/debug-logs', async (req, res) => {
  try {
    const homedir = os.homedir();
    const logDir = path.join(homedir, '.pm2/logs');
    
    if (!fs.existsSync(logDir)) {
      return res.json({ error: `PM2 log directory not found at ${logDir}` });
    }

    const files = fs.readdirSync(logDir);
    const result = {};

    for (const file of files) {
      if (file.includes('npc-eva-backend')) {
        const filePath = path.join(logDir, file);
        const stats = fs.statSync(filePath);
        // Read last 10KB of the file
        const fd = fs.openSync(filePath, 'r');
        const size = stats.size;
        const bufferSize = Math.min(size, 15000);
        const buffer = Buffer.alloc(bufferSize);
        fs.readSync(fd, buffer, 0, bufferSize, size - bufferSize);
        fs.closeSync(fd);
        result[file] = buffer.toString('utf8');
      }
    }

    res.json({ success: true, logDir, logs: result });
  } catch (error) {
    res.json({ success: false, error: error.message, stack: error.stack });
  }
});

const { exec } = require('child_process');
router.get('/debug-git', async (req, res) => {
  exec('git log -n 5 && git status', { cwd: path.join(__dirname, '../..') }, (err, stdout, stderr) => {
    if (err) {
      return res.json({ success: false, error: err.message, stderr });
    }
    res.json({ success: true, stdout, stderr });
  });
});

module.exports = router;
