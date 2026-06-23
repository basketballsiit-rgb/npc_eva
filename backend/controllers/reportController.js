const db = require('../config/db');
const { calculateFinalScore } = require('../utils/scoringAlgorithms');

// @desc    Get real-time leaderboard for an activity
// @route   GET /api/reports/leaderboard/:activityId
// @access  Private (Admins or Judges can see leaderboards)
const getLeaderboard = async (req, res, next) => {
  const { activityId } = req.params;

  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check permissions: only admins, or assigned judges with role 1 (President) or 2 (Secretary)
    if (userRole !== 'admin') {
      const [assignments] = await db.query(
        'SELECT is_head_judge FROM activity_judges WHERE activity_id = ? AND judge_id = ?',
        [activityId, userId]
      );
      if (assignments.length === 0) {
        res.status(403);
        throw new Error('ขออภัย คุณไม่ได้รับมอบหมายให้เข้าถึงกิจกรรมนี้');
      }
      const roleVal = parseInt(assignments[0].is_head_judge, 10) || 0;
      if (roleVal !== 1 && roleVal !== 2) {
        res.status(403);
        throw new Error('ขออภัย เฉพาะประธานกรรมการ หรือกรรมการและเลขานุการเท่านั้นที่มีสิทธิ์เปิดดู/พิมพ์รายงานนี้');
      }
    }
    // 1. Fetch activity details
    const [activities] = await db.query(
      'SELECT id, title, description, status, scoring_algorithm, criteria, host_organization, location FROM activities WHERE id = ?',
      [activityId]
    );

    if (activities.length === 0) {
      res.status(404);
      throw new Error('Activity not found');
    }

    const activity = activities[0];
    const criteria = typeof activity.criteria === 'string' ? JSON.parse(activity.criteria) : activity.criteria;

    // 2. Fetch all participants for this activity
    const [participants] = await db.query(
      'SELECT id, name, type, institution_code, project_title, team_members, project_url, attachment_url, department, level, year FROM participants WHERE activity_id = ?',
      [activityId]
    );

    // 3. Fetch all submitted scores with judge & participant details
    const [scores] = await db.query(
      `SELECT ts.id, ts.judge_id, ts.participant_id, ts.scores, ts.total_score, ts.submitted_at,
              u.fullname as judge_name, u.institution_code as judge_institution
       FROM transaction_scores ts
       JOIN users u ON ts.judge_id = u.id
       WHERE ts.activity_id = ?`,
      [activityId]
    );

    // 4. Fetch all assigned judges for this activity and check their score submission status
    const [assignedJudges] = await db.query(
      `SELECT u.id, u.fullname, u.institution_code, aj.is_head_judge 
       FROM activity_judges aj
       JOIN users u ON aj.judge_id = u.id
       WHERE aj.activity_id = ?`,
      [activityId]
    );

    const [submittedJudgeRows] = await db.query(
      'SELECT DISTINCT judge_id FROM transaction_scores WHERE activity_id = ?',
      [activityId]
    );
    const submittedJudgeIds = submittedJudgeRows.map(r => r.judge_id);

    const activityJudges = assignedJudges.map(j => ({
      id: j.id,
      fullname: j.fullname,
      institution_code: j.institution_code,
      is_head_judge: j.is_head_judge !== null && j.is_head_judge !== undefined ? parseInt(j.is_head_judge, 10) : 0,
      has_submitted: submittedJudgeIds.includes(j.id)
    }));

    const headJudge = activityJudges.find(j => parseInt(j.is_head_judge, 10) === 1);
    const headJudgeName = headJudge ? headJudge.fullname : 'Head Judge';

    // 5. Calculate scores for each participant
    const leaderboard = participants.map(part => {
      const partScores = scores.filter(s => s.participant_id === part.id);
      
      // Parse individual criteria scores for audit view
      const judgeBreakdowns = partScores.map(ps => ({
        judge_id: ps.judge_id,
        judge_name: ps.judge_name,
        judge_institution: ps.judge_institution,
        total_score: parseFloat(ps.total_score),
        scores: typeof ps.scores === 'string' ? JSON.parse(ps.scores) : ps.scores
      }));

      // Calculate final score based on selected algorithm
      const finalScore = calculateFinalScore(
        partScores, 
        activity.scoring_algorithm, 
        part.institution_code
      );

      return {
        participant_id: part.id,
        name: part.name,
        institution_code: part.institution_code,
        project_title: part.project_title,
        team_members: part.team_members,
        project_url: part.project_url,
        attachment_url: part.attachment_url,
        department: part.department,
        level: part.level,
        year: part.year,
        final_score: finalScore,
        evaluations_count: partScores.length,
        judges_scores: judgeBreakdowns
      };
    });

    // Sort descending by final score
    leaderboard.sort((a, b) => b.final_score - a.final_score);

    // Fetch system settings
    const [settingsRows] = await db.query('SELECT * FROM system_settings');
    const settings = {};
    settingsRows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    res.json({
      activity: {
        id: activity.id,
        title: activity.title,
        status: activity.status,
        scoring_algorithm: activity.scoring_algorithm,
        criteria: criteria,
        host_organization: activity.host_organization,
        location: activity.location
      },
      head_judge_name: headJudgeName,
      activity_judges: activityJudges,
      leaderboard,
      system_settings: settings
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLeaderboard
};
