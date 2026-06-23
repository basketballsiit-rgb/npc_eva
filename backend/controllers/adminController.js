const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Helper to check if an activity has scores
const hasScores = async (activityId) => {
  const [rows] = await db.query('SELECT COUNT(*) as count FROM transaction_scores WHERE activity_id = ?', [activityId]);
  return rows[0].count > 0;
};

// @desc    Get dashboard summary statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res, next) => {
  try {
    const [activitiesCount] = await db.query('SELECT COUNT(*) as count FROM activities');
    const [judgesCount] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "judge"');
    const [participantsCount] = await db.query('SELECT COUNT(*) as count FROM participants');
    const [activeCompetitions] = await db.query(
      'SELECT id, title, status, scoring_algorithm, start_date, end_date FROM activities WHERE status = "Active"'
    );

    // Calculate live rankings for each active competition
    const liveRankings = [];
    for (const comp of activeCompetitions) {
      // Get all participants
      const [participants] = await db.query(
        'SELECT id, name, type, institution_code FROM participants WHERE activity_id = ?',
        [comp.id]
      );

      // Get all scores for this activity
      const [scores] = await db.query(
        `SELECT ts.*, u.institution_code as judge_institution 
         FROM transaction_scores ts 
         JOIN users u ON ts.judge_id = u.id 
         WHERE ts.activity_id = ?`,
        [comp.id]
      );

      const participantRankings = participants.map(part => {
        const partScores = scores.filter(s => s.participant_id === part.id);
        let finalScore = 0;
        const totalJudges = partScores.length;

        if (totalJudges > 0) {
          if (comp.scoring_algorithm === 'coi_prevention') {
            // Exclude scores from judges who share the same institution code
            const filteredScores = partScores.filter(s => s.judge_institution !== part.institution_code);
            const divisor = filteredScores.length > 0 ? filteredScores.length : partScores.length;
            const targetScores = filteredScores.length > 0 ? filteredScores : partScores;
            const sum = targetScores.reduce((acc, curr) => acc + parseFloat(curr.total_score), 0);
            finalScore = sum / divisor;
          } else if (comp.scoring_algorithm === 'trimmed_mean' && totalJudges >= 3) {
            // Trim highest and lowest
            const sorted = [...partScores].map(s => parseFloat(s.total_score)).sort((a, b) => a - b);
            const trimmed = sorted.slice(1, -1);
            const sum = trimmed.reduce((acc, curr) => acc + curr, 0);
            finalScore = sum / trimmed.length;
          } else {
            // Standard Average
            const sum = partScores.reduce((acc, curr) => acc + parseFloat(curr.total_score), 0);
            finalScore = sum / totalJudges;
          }
        }

        return {
          id: part.id,
          name: part.name,
          institution_code: part.institution_code,
          score: parseFloat(finalScore.toFixed(2)),
          evaluations_submitted: totalJudges
        };
      }).sort((a, b) => b.score - a.score);

      liveRankings.push({
        activity_id: comp.id,
        title: comp.title,
        scoring_algorithm: comp.scoring_algorithm,
        rankings: participantRankings
      });
    }

    res.json({
      activitiesCount: activitiesCount[0].count,
      judgesCount: judgesCount[0].count,
      participantsCount: participantsCount[0].count,
      liveRankings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all activities
// @route   GET /api/admin/activities
// @access  Private/Admin
const getActivities = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, u.fullname as creator_name,
       (SELECT COUNT(*) FROM participants WHERE activity_id = a.id) as participant_count,
       (SELECT COUNT(*) FROM activity_judges WHERE activity_id = a.id) as judge_count,
       (SELECT COUNT(*) FROM transaction_scores WHERE activity_id = a.id) as evaluations_submitted
       FROM activities a
       LEFT JOIN users u ON a.created_by = u.id
       ORDER BY a.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

// @desc    Get activity by ID with full details
// @route   GET /api/admin/activities/:id
// @access  Private/Admin
const getActivityById = async (req, res, next) => {
  try {
    const [activities] = await db.query('SELECT * FROM activities WHERE id = ?', [req.params.id]);
    if (activities.length === 0) {
      res.status(404);
      throw new Error('Activity not found');
    }

    const activity = activities[0];

    // Fetch assigned judges
    const [judges] = await db.query(
      `SELECT u.id, u.fullname, u.username, u.institution_code, aj.is_head_judge 
       FROM activity_judges aj
       JOIN users u ON aj.judge_id = u.id
       WHERE aj.activity_id = ?`,
      [req.params.id]
    );

    // Fetch participants
    const [participants] = await db.query(
      'SELECT id, name, type, institution_code, institution_name, project_title, team_members, project_url, attachment_url, department, level, year, advisors FROM participants WHERE activity_id = ?',
      [req.params.id]
    );

    res.json({
      ...activity,
      judges,
      participants
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new activity
// @route   POST /api/admin/activities
// @access  Private/Admin
const createActivity = async (req, res, next) => {
  const { title, description, start_date, end_date, location, host_organization, status, scoring_algorithm, competition_type, criteria, expected_judges, logo_url, banner_url, login_config, judges } = req.body;

  try {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO activities (title, description, start_date, end_date, location, host_organization, status, scoring_algorithm, competition_type, criteria, expected_judges, logo_url, banner_url, login_config, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title, 
          description, 
          start_date, 
          end_date, 
          location, 
          host_organization, 
          status || 'Draft', 
          scoring_algorithm || 'standard_average', 
          competition_type || 'in_institution', 
          JSON.stringify(criteria), 
          expected_judges !== undefined ? parseInt(expected_judges, 10) : 3, 
          logo_url || null, 
          banner_url || null, 
          login_config ? (typeof login_config === 'string' ? login_config : JSON.stringify(login_config)) : null, 
          req.user.id
        ]
      );
      const activityId = result.insertId;

      // Save judges if provided
      if (judges && judges.length > 0) {
        const values = judges.map(j => [activityId, j.id, parseInt(j.is_head_judge, 10) || 0]);
        await conn.query(
          'INSERT INTO activity_judges (activity_id, judge_id, is_head_judge) VALUES ?',
          [values]
        );
      }

      await conn.commit();
      res.status(201).json({ id: activityId, message: 'Activity created successfully' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update activity
// @route   PUT /api/admin/activities/:id
// @access  Private/Admin
const updateActivity = async (req, res, next) => {
  const { title, description, start_date, end_date, location, host_organization, status, scoring_algorithm, competition_type, criteria, expected_judges, logo_url, banner_url, login_config, judges } = req.body;
  const activityId = req.params.id;

  try {
    // If activity already has scores, warn/restrict modifying critical fields like criteria or algorithm
    const hasExistingScores = await hasScores(activityId);
    const conn = await db.getConnection();
    
    try {
      await conn.beginTransaction();

      if (hasExistingScores) {
        // Only allow updating basic descriptive fields and status, prevent changing criteria/algorithm/judges
        await conn.query(
          `UPDATE activities 
           SET title = ?, description = ?, start_date = ?, end_date = ?, location = ?, host_organization = ?, status = ?, competition_type = ?, logo_url = ?, banner_url = ?, login_config = ?
           WHERE id = ?`,
          [
            title, 
            description, 
            start_date, 
            end_date, 
            location, 
            host_organization, 
            status, 
            competition_type || 'in_institution', 
            logo_url || null, 
            banner_url || null, 
            login_config ? (typeof login_config === 'string' ? login_config : JSON.stringify(login_config)) : null, 
            activityId
          ]
        );

        // Update is_head_judge for currently assigned judges
        if (judges && judges.length > 0) {
          // 1. Get currently assigned judge IDs
          const [currentRows] = await conn.query('SELECT judge_id FROM activity_judges WHERE activity_id = ?', [activityId]);
          const currentJudgeIds = currentRows.map(r => r.judge_id);

          // 2. Reset all to is_head_judge = 0 for this activity
          await conn.query('UPDATE activity_judges SET is_head_judge = 0 WHERE activity_id = ?', [activityId]);

          // 3. Update role for each assigned judge
          for (const j of judges) {
            if (currentJudgeIds.includes(j.id)) {
              const roleVal = parseInt(j.is_head_judge, 10) || 0;
              await conn.query(
                'UPDATE activity_judges SET is_head_judge = ? WHERE activity_id = ? AND judge_id = ?',
                [roleVal, activityId, j.id]
              );
            }
          }
        }
        
        await conn.commit();
        return res.json({ message: 'Activity updated successfully. Scoring parameters locked due to active scores.' });
      }

      // Otherwise, allow full edit
      await conn.query(
        `UPDATE activities 
         SET title = ?, description = ?, start_date = ?, end_date = ?, location = ?, host_organization = ?, status = ?, scoring_algorithm = ?, competition_type = ?, criteria = ?, expected_judges = ?, logo_url = ?, banner_url = ?, login_config = ?
         WHERE id = ?`,
        [
          title, 
          description, 
          start_date, 
          end_date, 
          location, 
          host_organization, 
          status, 
          scoring_algorithm, 
          competition_type || 'in_institution', 
          JSON.stringify(criteria), 
          expected_judges !== undefined ? parseInt(expected_judges, 10) : 3, 
          logo_url || null, 
          banner_url || null, 
          login_config ? (typeof login_config === 'string' ? login_config : JSON.stringify(login_config)) : null, 
          activityId
        ]
      );

      // Update judges list: delete and insert
      await conn.query('DELETE FROM activity_judges WHERE activity_id = ?', [activityId]);
      if (judges && judges.length > 0) {
        const values = judges.map(j => [activityId, j.id, parseInt(j.is_head_judge, 10) || 0]);
        await conn.query(
          'INSERT INTO activity_judges (activity_id, judge_id, is_head_judge) VALUES ?',
          [values]
        );
      }

      await conn.commit();
      res.json({ message: 'Activity updated successfully' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Clone past activity (copies criteria/rules, resets dates/judges/scores)
// @route   POST /api/admin/activities/:id/clone
// @access  Private/Admin
const cloneActivity = async (req, res, next) => {
  const activityId = req.params.id;

  try {
    const [rows] = await db.query('SELECT * FROM activities WHERE id = ?', [activityId]);
    if (rows.length === 0) {
      res.status(404);
      throw new Error('Source activity not found');
    }

    const source = rows[0];
    const newTitle = `Copy of ${source.title}`;
    
    // Default clone dates: today to 3 days from now
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + 3);

    const [result] = await db.query(
      `INSERT INTO activities (title, description, start_date, end_date, location, host_organization, status, scoring_algorithm, competition_type, criteria, expected_judges, logo_url, banner_url, login_config, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'Draft', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newTitle, 
        source.description, 
        now, 
        future, 
        source.location, 
        source.host_organization, 
        source.scoring_algorithm, 
        source.competition_type || 'in_institution', 
        JSON.stringify(source.criteria), 
        source.expected_judges || 3,
        source.logo_url || null,
        source.banner_url || null,
        source.login_config ? (typeof source.login_config === 'string' ? source.login_config : JSON.stringify(source.login_config)) : null,
        req.user.id
      ]
    );

    res.status(201).json({ id: result.insertId, message: 'Activity cloned successfully as Draft' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete activity
// @route   DELETE /api/admin/activities/:id
// @access  Private/Admin
const deleteActivity = async (req, res, next) => {
  const activityId = req.params.id;
  const force = req.query.force === 'true';

  try {
    const hasExistingScores = await hasScores(activityId);

    if (hasExistingScores && req.user.role === 'staff') {
      res.status(403);
      throw new Error('Staff users are not permitted to delete activities with submitted scores.');
    }

    if (hasExistingScores && !force) {
      res.status(400);
      throw new Error('Cannot delete activity with submitted scores. Please Archive it instead.');
    }

    if (force) {
      // Temporarily drop the append-only trigger to allow cascade delete
      await db.query('DROP TRIGGER IF EXISTS prevent_scores_delete');
      await db.query('DROP TRIGGER IF EXISTS prevent_scores_update');

      try {
        await db.query('DELETE FROM transaction_scores WHERE activity_id = ?', [activityId]);
        await db.query('DELETE FROM participants WHERE activity_id = ?', [activityId]);
        await db.query('DELETE FROM activity_judges WHERE activity_id = ?', [activityId]);
      } finally {
        // Always recreate triggers after deletion (even if delete failed)
        await db.query(`
          CREATE TRIGGER prevent_scores_delete
          BEFORE DELETE ON transaction_scores
          FOR EACH ROW
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Strict Append-Only Rule violation: Deletions are not permitted on transaction_scores.'
        `).catch(() => {}); // ignore if already exists

        await db.query(`
          CREATE TRIGGER prevent_scores_update
          BEFORE UPDATE ON transaction_scores
          FOR EACH ROW
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Strict Append-Only Rule violation: Updates are not permitted on transaction_scores.'
        `).catch(() => {});
      }
    }

    await db.query('DELETE FROM activities WHERE id = ?', [activityId]);
    res.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all judges
// @route   GET /api/admin/judges
// @access  Private/Admin
const getJudges = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT id, username, fullname, institution_code, role, status, created_at,
       (SELECT COUNT(*) FROM transaction_scores WHERE judge_id = users.id) as submission_count
       FROM users 
       WHERE role = "judge"
       ORDER BY fullname ASC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new judge
// @route   POST /api/admin/judges
// @access  Private/Admin
const createJudge = async (req, res, next) => {
  const { username, password, fullname, institution_code, autoGenerate } = req.body;

  try {
    if (!fullname) {
      res.status(400);
      throw new Error('Full name is required');
    }

    let finalUsername = username;
    let plainPassword = password;
    let isAutoGenerated = false;

    if (autoGenerate || !username || !password) {
      isAutoGenerated = true;
      if (!username) {
        // Query database to find all usernames starting with 'j' to find the next sequential number
        const [rows] = await db.query("SELECT username FROM users WHERE username LIKE 'j%'");
        let maxVal = 0;
        for (const row of rows) {
          const u = row.username;
          if (/^j\d+$/.test(u)) {
            const num = parseInt(u.substring(1), 10);
            if (num > maxVal) {
              maxVal = num;
            }
          }
        }
        const nextVal = maxVal + 1;
        finalUsername = `j${String(nextVal).padStart(3, '0')}`;
      } else {
        finalUsername = username;
      }

      if (!password) {
        plainPassword = '123456';
      } else {
        plainPassword = password;
      }
    }

    // Double check unique username
    const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [finalUsername]);
    if (existing.length > 0) {
      res.status(400);
      throw new Error('Username already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(plainPassword, salt);

    const [result] = await db.query(
      `INSERT INTO users (username, password_hash, fullname, role, institution_code, status)
       VALUES (?, ?, ?, 'judge', ?, 'active')`,
      [finalUsername, password_hash, fullname, institution_code || null]
    );

    res.status(201).json({ 
      id: result.insertId,
      message: 'Judge created successfully',
      autoGenerated: isAutoGenerated,
      credentials: isAutoGenerated ? { username: finalUsername, password: plainPassword } : null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update judge status (enable/disable)
// @route   PUT /api/admin/judges/:id/status
// @access  Private/Admin
const updateJudgeStatus = async (req, res, next) => {
  const judgeId = req.params.id;
  const { status } = req.body;

  try {
    if (!['active', 'disabled'].includes(status)) {
      res.status(400);
      throw new Error('Invalid status value');
    }

    await db.query('UPDATE users SET status = ? WHERE id = ?', [status, judgeId]);
    res.json({ message: `Judge status updated to ${status}` });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset judge password
// @route   PUT /api/admin/judges/:id/reset-password
// @access  Private/Admin
const resetJudgePassword = async (req, res, next) => {
  const judgeId = req.params.id;
  const { password } = req.body;

  try {
    if (!password || password.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters long');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, judgeId]);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
};

// @desc    Add participants/teams to an activity
// @route   POST /api/admin/activities/:id/participants
// @access  Private/Admin
const addParticipant = async (req, res, next) => {
  const activityId = req.params.id;
  const { name, type, institution_code, institution_name, project_title, team_members, project_url, attachment_url, department, level, year, advisors } = req.body;

  try {
    if (!name) {
      res.status(400);
      throw new Error('Participant name is required');
    }

    // Get activity details to check competition type
    const [activities] = await db.query('SELECT competition_type FROM activities WHERE id = ?', [activityId]);
    if (activities.length === 0) {
      res.status(404);
      throw new Error('Activity not found');
    }
    const compType = activities[0].competition_type;

    if (compType === 'out_institution' && (!institution_code || !institution_name)) {
      res.status(400);
      throw new Error('Institution code and institution name are required for external competitions');
    }

    const [result] = await db.query(
      'INSERT INTO participants (activity_id, name, type, institution_code, institution_name, project_title, team_members, project_url, attachment_url, department, level, year, advisors) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        activityId, 
        name, 
        type || 'individual', 
        compType === 'out_institution' ? institution_code : null,
        compType === 'out_institution' ? institution_name : null,
        project_title || null,
        team_members || null,
        project_url || null,
        attachment_url || null,
        (type || 'individual') === 'individual' ? (department || null) : null,
        (type || 'individual') === 'individual' ? (level || null) : null,
        (type || 'individual') === 'individual' ? (year || null) : null,
        advisors || null
      ]
    );

    res.status(201).json({ id: result.insertId, message: 'Participant added successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove participant from activity
// @route   DELETE /api/admin/participants/:id
// @access  Private/Admin
const deleteParticipant = async (req, res, next) => {
  const participantId = req.params.id;

  try {
    // Check if score exists
    const [rows] = await db.query('SELECT COUNT(*) as count FROM transaction_scores WHERE participant_id = ?', [participantId]);
    if (rows[0].count > 0) {
      res.status(400);
      throw new Error('Cannot delete participant with submitted evaluations.');
    }

    await db.query('DELETE FROM participants WHERE id = ?', [participantId]);
    res.json({ message: 'Participant removed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign judges to activity (clears past, saves new)
// @route   POST /api/admin/activities/:id/judges
// @access  Private/Admin
const assignJudges = async (req, res, next) => {
  const activityId = req.params.id;
  const { judges } = req.body; // Array of { id, is_head_judge }

  try {
    // Get database connection from pool for transaction support
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Check if scores exist already
      const [scores] = await conn.query('SELECT COUNT(*) as count FROM transaction_scores WHERE activity_id = ?', [activityId]);
      if (scores[0].count > 0) {
        throw new Error('Cannot re-assign judges: scoring has already started for this activity.');
      }

      // Delete existing assignments
      await conn.query('DELETE FROM activity_judges WHERE activity_id = ?', [activityId]);

      // Insert new ones if provided
      if (judges && judges.length > 0) {
        const values = judges.map(j => [activityId, j.id, parseInt(j.is_head_judge, 10) || 0]);
        await conn.query(
          'INSERT INTO activity_judges (activity_id, judge_id, is_head_judge) VALUES ?',
          [values]
        );
      }

      await conn.commit();
      res.json({ message: 'Judges assigned successfully' });
    } catch (err) {
      await conn.rollback();
      res.status(400);
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update judge details
// @route   PUT /api/admin/judges/:id
// @access  Private/Admin
const updateJudge = async (req, res, next) => {
  const judgeId = req.params.id;
  const { fullname, username, institution_code } = req.body;

  try {
    if (!fullname || !username) {
      res.status(400);
      throw new Error('Full name and Username are required');
    }

    // Check if username already exists for another user
    const [existing] = await db.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, judgeId]);
    if (existing.length > 0) {
      res.status(400);
      throw new Error('Username already exists');
    }

    await db.query(
      `UPDATE users 
       SET fullname = ?, username = ?, institution_code = ? 
       WHERE id = ?`,
      [fullname, username, institution_code || null, judgeId]
    );

    res.json({ message: 'Judge details updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete judge
// @route   DELETE /api/admin/judges/:id
// @access  Private/Admin
const deleteJudge = async (req, res, next) => {
  const judgeId = req.params.id;

  try {
    // 1. Check if judge has submitted any scores and list activities if they have
    const [activitiesWithScores] = await db.query(
      `SELECT DISTINCT a.title 
       FROM transaction_scores ts
       JOIN activities a ON ts.activity_id = a.id
       WHERE ts.judge_id = ?`,
      [judgeId]
    );

    if (activitiesWithScores.length > 0) {
      const activityList = activitiesWithScores.map(row => `- ${row.title}`).join('\n');
      res.status(400);
      throw new Error(`ไม่สามารถลบกรรมการท่านนี้ได้ เนื่องจากมีประวัติการบันทึกคะแนนในกิจกรรมดังต่อไปนี้:\n${activityList}\n\nกรุณาใช้ฟังก์ชัน "ระงับการใช้งาน" แทนหากต้องการปิดการเข้าใช้งาน`);
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 2. Delete assignments from activity_judges
      await conn.query('DELETE FROM activity_judges WHERE judge_id = ?', [judgeId]);

      // 3. Delete from users table
      const [result] = await conn.query('DELETE FROM users WHERE id = ? AND role = "judge"', [judgeId]);
      
      if (result.affectedRows === 0) {
        throw new Error('ไม่พบข้อมูลกรรมการดังกล่าว หรือไม่สามารถลบผู้ดูแลระบบได้');
      }

      await conn.commit();
      res.json({ message: 'ลบรายชื่อกรรมการออกจากระบบเรียบร้อยแล้ว' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Private/Admin
const getSystemSettings = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM system_settings');
    const settings = {};
    rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

// @desc    Update system settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
const updateSystemSettings = async (req, res, next) => {
  try {
    const { institution_logo, institution_name } = req.body;

    if (institution_logo !== undefined) {
      await db.query(
        'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        ['institution_logo', institution_logo, institution_logo]
      );
    }

    if (institution_name !== undefined) {
      await db.query(
        'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        ['institution_name', institution_name, institution_name]
      );
    }

    res.json({ message: 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all staff users
// @route   GET /api/admin/staff
// @access  Private/Admin (Super Admin only)
const getStaff = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT id, username, fullname, role, status, created_at FROM users 
       WHERE role = "staff" 
       ORDER BY fullname ASC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new staff user
// @route   POST /api/admin/staff
// @access  Private/Admin (Super Admin only)
const createStaff = async (req, res, next) => {
  const { username, password, fullname } = req.body;

  try {
    if (!username || !password || !fullname) {
      res.status(400);
      throw new Error('กรุณาระบุข้อมูลให้ครบถ้วน (ชื่อผู้ใช้, รหัสผ่าน, และชื่อ-นามสกุล)');
    }

    // Check unique username
    const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      res.status(400);
      throw new Error('ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const [result] = await db.query(
      `INSERT INTO users (username, password_hash, fullname, role, status)
       VALUES (?, ?, ?, 'staff', 'active')`,
      [username, password_hash, fullname]
    );

    res.status(201).json({ id: result.insertId, message: 'เพิ่มเจ้าหน้าที่เรียบร้อยแล้ว' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a staff user
// @route   PUT /api/admin/staff/:id
// @access  Private/Admin (Super Admin only)
const updateStaff = async (req, res, next) => {
  const staffId = req.params.id;
  const { username, password, fullname, status } = req.body;

  try {
    if (!fullname || !username) {
      res.status(400);
      throw new Error('กรุณาระบุชื่อ-นามสกุล และชื่อผู้ใช้');
    }

    // Check unique username excluding current user
    const [existing] = await db.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, staffId]);
    if (existing.length > 0) {
      res.status(400);
      throw new Error('ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว');
    }

    let query = 'UPDATE users SET username = ?, fullname = ?, status = ?';
    const params = [username, fullname, status || 'active'];

    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      query += ', password_hash = ?';
      params.push(password_hash);
    }

    query += ' WHERE id = ? AND role = "staff"';
    params.push(staffId);

    const [result] = await db.query(query, params);
    if (result.affectedRows === 0) {
      res.status(404);
      throw new Error('ไม่พบข้อมูลเจ้าหน้าที่');
    }

    res.json({ message: 'แก้ไขข้อมูลเจ้าหน้าที่เรียบร้อยแล้ว' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a staff user
// @route   DELETE /api/admin/staff/:id
// @access  Private/Admin (Super Admin only)
const deleteStaff = async (req, res, next) => {
  const staffId = req.params.id;
  try {
    // Check if they created any activities
    const [activities] = await db.query('SELECT COUNT(*) as count FROM activities WHERE created_by = ?', [staffId]);
    if (activities[0].count > 0) {
      res.status(400);
      throw new Error('ไม่สามารถลบเจ้าหน้าที่รายนี้ได้เนื่องจากมีกิจกรรมที่สร้างขึ้นโดยเจ้าหน้าที่รายนี้อยู่ในระบบ');
    }

    const [result] = await db.query('DELETE FROM users WHERE id = ? AND role = "staff"', [staffId]);
    if (result.affectedRows === 0) {
      res.status(404);
      throw new Error('ไม่พบข้อมูลเจ้าหน้าที่');
    }
    res.json({ message: 'ลบเจ้าหน้าที่เรียบร้อยแล้ว' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
  updateSystemSettings,
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff
};
