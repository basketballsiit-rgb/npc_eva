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

module.exports = { loginUser, getMe, getPublicActivity };
