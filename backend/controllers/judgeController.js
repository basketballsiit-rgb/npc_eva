const db = require('../config/db');

// @desc    Get activities assigned to the judge with participant statuses
// @route   GET /api/judge/tasks
// @access  Private/Judge
const getMyTasks = async (req, res, next) => {
  try {
    const judgeId = req.user.id;

    // Get assigned activities
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
        'SELECT id, name, type, institution_code, project_title, team_members, project_url, attachment_url, department, level, year, advisors FROM participants WHERE activity_id = ?',
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
          project_title: part.project_title,
          team_members: part.team_members,
          project_url: part.project_url,
          attachment_url: part.attachment_url,
          department: part.department,
          level: part.level,
          year: part.year,
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

    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

// @desc    Submit score for a participant (Append-only)
// @route   POST /api/judge/scores
// @access  Private/Judge
const submitScore = async (req, res, next) => {
  const { activityId, participantId, scores } = req.body; // scores = { crit_1: score_val, crit_2: score_val }
  const judgeId = req.user.id;

  try {
    if (!activityId || !participantId || !scores) {
      res.status(400);
      throw new Error('Missing evaluation parameters');
    }

    // 1. Verify activity state
    const [activities] = await db.query('SELECT status, criteria FROM activities WHERE id = ?', [activityId]);
    if (activities.length === 0) {
      res.status(404);
      throw new Error('Activity not found');
    }

    const activity = activities[0];
    if (activity.status !== 'Active') {
      res.status(400);
      throw new Error('Scoring is only allowed on Active activities');
    }

    // 2. Verify judge assignment
    const [assignments] = await db.query(
      'SELECT 1 FROM activity_judges WHERE activity_id = ? AND judge_id = ?',
      [activityId, judgeId]
    );
    if (assignments.length === 0) {
      res.status(403);
      throw new Error('You are not assigned to judge this activity');
    }

    // 3. Prevent duplicate submissions (Strict Append-only UX & database UNIQUE rule)
    const [existing] = await db.query(
      'SELECT id FROM transaction_scores WHERE activity_id = ? AND judge_id = ? AND participant_id = ?',
      [activityId, judgeId, participantId]
    );
    if (existing.length > 0) {
      res.status(400);
      throw new Error('You have already submitted a score for this participant. Modifications are not allowed.');
    }

    // 4. Validate submitted scores against JSON criteria schema (hierarchical)
    const parsedCriteria = typeof activity.criteria === 'string' ? JSON.parse(activity.criteria) : activity.criteria;
    
    // Helper to get leaf nodes recursively
    const getLeafNodes = (nodes) => {
      let leaves = [];
      const traverse = (list) => {
        if (!list) return;
        for (const node of list) {
          if (!node.children || node.children.length === 0) {
            leaves.push(node);
          } else {
            traverse(node.children);
          }
        }
      };
      traverse(nodes);
      return leaves;
    };

    const leafNodes = getLeafNodes(parsedCriteria);
    
    // Validate each leaf node has a valid score
    for (const leaf of leafNodes) {
      const submittedValue = scores[leaf.id];
      if (submittedValue === undefined || submittedValue === null) {
        res.status(400);
        throw new Error(`Score for criteria "${leaf.name}" is missing`);
      }

      const scoreNum = parseFloat(submittedValue);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > leaf.max_score) {
        res.status(400);
        throw new Error(`Score for "${leaf.name}" must be a number between 0 and ${leaf.max_score}`);
      }
    }

    // Helper to calculate total recursively
    const calculateTreeScore = (nodes, submitted) => {
      const evaluateNode = (node) => {
        if (!node.children || node.children.length === 0) {
          return parseFloat(submitted[node.id]) || 0;
        }
        let sum = 0;
        for (const child of node.children) {
          const w = child.weight !== undefined ? parseFloat(child.weight) : 1.0;
          sum += evaluateNode(child) * w;
        }
        return sum;
      };

      let total = 0;
      for (const mainNode of nodes) {
        const w = mainNode.weight !== undefined ? parseFloat(mainNode.weight) : 1.0;
        total += evaluateNode(mainNode) * w;
      }
      return total;
    };

    const computedTotalScore = calculateTreeScore(parsedCriteria, scores);

    // 5. Write to transaction_scores table (Trigger will lock it against updates/deletes)
    await db.query(
      `INSERT INTO transaction_scores (activity_id, judge_id, participant_id, scores, total_score)
       VALUES (?, ?, ?, ?, ?)`,
      [activityId, judgeId, participantId, JSON.stringify(scores), computedTotalScore]
    );

    res.status(201).json({
      message: 'Evaluation submitted successfully. Score is locked and finalized.',
      total_score: computedTotalScore
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get history of evaluations completed by this judge
// @route   GET /api/judge/history
// @access  Private/Judge
const getMyHistory = async (req, res, next) => {
  try {
    const judgeId = req.user.id;

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

    // Map and parse the scores JSON
    const history = rows.map(r => ({
      ...r,
      scores: typeof r.scores === 'string' ? JSON.parse(r.scores) : r.scores
    }));

    res.json(history);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyTasks,
  submitScore,
  getMyHistory
};
