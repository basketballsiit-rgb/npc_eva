const db = require('./db');

const runMigrations = async () => {
  try {
    console.log('=== Running Auto-Migrations ===');

    // 1. Check participants table for department, level, year
    const [participantsCols] = await db.query("SHOW COLUMNS FROM participants");
    const colNames = participantsCols.map(c => c.Field);

    if (!colNames.includes('department')) {
      await db.query("ALTER TABLE participants ADD COLUMN department VARCHAR(255) NULL");
      console.log('Migration: Added department column to participants table.');
    }
    if (!colNames.includes('level')) {
      await db.query("ALTER TABLE participants ADD COLUMN level VARCHAR(50) NULL");
      console.log('Migration: Added level column to participants table.');
    }
    if (!colNames.includes('year')) {
      await db.query("ALTER TABLE participants ADD COLUMN year VARCHAR(50) NULL");
      console.log('Migration: Added year column to participants table.');
    }

    // 2. Double check users table role column contains 'staff'
    const [usersCols] = await db.query("SHOW COLUMNS FROM users LIKE 'role'");
    if (usersCols.length > 0) {
      const type = usersCols[0].Type;
      if (!type.includes('staff')) {
        await db.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'staff', 'judge') NOT NULL DEFAULT 'judge'");
        console.log('Migration: Modified users.role enum to include staff.');
      }
    }

    console.log('=== Auto-Migrations Completed Successfully ===');
  } catch (err) {
    console.error('Migration error:', err.message);
  }
};

module.exports = runMigrations;
