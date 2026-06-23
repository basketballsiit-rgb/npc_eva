const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      fullname: user.fullname,
      institution_code: user.institution_code
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  const { username, password, activityId } = req.body;

  try {
    if (!username || !password) {
      res.status(400);
      throw new Error('Please provide username and password');
    }

    const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    
    if (users.length === 0) {
      res.status(401);
      throw new Error('Invalid username or password');
    }

    const user = users[0];

    if (user.status !== 'active') {
      res.status(403);
      throw new Error('This account has been disabled. Please contact the administrator.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid username or password');
    }

    // Activity-specific login check
    if (activityId) {
      if (user.role === 'judge') {
        const [assignments] = await db.query(
          'SELECT COUNT(*) as count FROM activity_judges WHERE activity_id = ? AND judge_id = ?',
          [activityId, user.id]
        );
        if (assignments[0].count === 0) {
          res.status(403);
          throw new Error('บัญชีผู้ใช้ของคุณไม่ได้รับอนุญาตให้เข้าระบบประเมินสำหรับกิจกรรมนี้');
        }
      }
    }

    res.json({
      id: user.id,
      username: user.username,
      fullname: user.fullname,
      role: user.role,
      institution_code: user.institution_code,
      token: generateToken(user)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user details
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const [users] = await db.query(
      'SELECT id, username, fullname, role, institution_code, status FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      res.status(404);
      throw new Error('User not found');
    }

    res.json(users[0]);
  } catch (error) {
    next(error);
  }
};

// @desc    Get public activity details for custom login page
// @route   GET /api/auth/activities/public/:id
// @access  Public
const getPublicActivity = async (req, res, next) => {
  try {
    const [activities] = await db.query(
      'SELECT id, title, start_date, end_date, location, host_organization, status, expected_judges, logo_url, banner_url, login_config FROM activities WHERE id = ?',
      [req.params.id]
    );

    if (activities.length === 0) {
      res.status(404);
      throw new Error('Activity not found');
    }

    const activity = activities[0];

    // Fetch system settings
    const [settingsRows] = await db.query('SELECT * FROM system_settings');
    const settings = {};
    settingsRows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    res.json({
      ...activity,
      system_settings: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register competitor public page
// @route   POST /api/auth/activities/public/:id/register
// @access  Public
const registerParticipantPublic = async (req, res, next) => {
  const activityId = req.params.id;
  const { name, type, institution_code, project_title, team_members, project_url, department, level, year } = req.body;
  const file = req.file;

  try {
    // 1. Get activity details
    const [activities] = await db.query('SELECT competition_type, login_config FROM activities WHERE id = ?', [activityId]);
    if (activities.length === 0) {
      res.status(404);
      throw new Error('ไม่พบกิจกรรมการประกวดนี้');
    }
    
    const activity = activities[0];
    const loginConfig = typeof activity.login_config === 'string'
      ? JSON.parse(activity.login_config)
      : activity.login_config || {};

    // 2. Check if registration is enabled
    if (!loginConfig.enable_registration) {
      res.status(400);
      throw new Error('กิจกรรมนี้ไม่เปิดรับสมัครลงทะเบียนออนไลน์');
    }

    if (!name) {
      res.status(400);
      throw new Error('กรุณาระบุชื่อผู้แข่งขันหรือชื่อทีม');
    }

    const compType = activity.competition_type;
    if (compType === 'out_institution' && !institution_code) {
      res.status(400);
      throw new Error('กรุณาระบุรหัสวิทยาลัย/สังกัดสถาบัน');
    }

    // Process attachment URL if uploaded
    let attachment_url = null;
    if (file) {
      attachment_url = `/api/uploads/${file.filename}`;
    }

    const [result] = await db.query(
      'INSERT INTO participants (activity_id, name, type, institution_code, project_title, team_members, project_url, attachment_url, department, level, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        activityId, 
        name, 
        type || 'individual', 
        compType === 'out_institution' ? institution_code : null,
        project_title || null,
        team_members || null,
        project_url || null,
        attachment_url,
        (type || 'individual') === 'individual' ? (department || null) : null,
        (type || 'individual') === 'individual' ? (level || null) : null,
        (type || 'individual') === 'individual' ? (year || null) : null
      ]
    );

    res.status(201).json({ id: result.insertId, message: 'ลงทะเบียนสมัครแข่งขันสำเร็จเรียบร้อยแล้ว' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public system settings
// @route   GET /api/auth/settings
// @access  Public
const getPublicSettings = async (req, res, next) => {
  try {
    const [settingsRows] = await db.query('SELECT * FROM system_settings');
    const settings = {};
    settingsRows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

module.exports = { 
  loginUser, 
  getMe, 
  getPublicActivity, 
  registerParticipantPublic,
  getPublicSettings
};
