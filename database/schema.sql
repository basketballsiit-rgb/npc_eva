-- 1. Users Table (Admins and Judges)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `fullname` VARCHAR(100) NOT NULL,
  `role` ENUM('admin', 'staff', 'judge') NOT NULL DEFAULT 'judge',
  `institution_code` VARCHAR(50) DEFAULT NULL, -- For COI (Conflict of Interest) checks
  `status` ENUM('active', 'disabled') NOT NULL DEFAULT 'active', -- Do not hard delete judges
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Activities Table
CREATE TABLE IF NOT EXISTS `activities` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `start_date` DATETIME NOT NULL,
  `end_date` DATETIME NOT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  `host_organization` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('Draft', 'Active', 'Completed', 'Archived') NOT NULL DEFAULT 'Draft',
  `scoring_algorithm` ENUM('standard_average', 'coi_prevention', 'trimmed_mean') NOT NULL DEFAULT 'standard_average',
  `competition_type` ENUM('in_institution', 'out_institution') NOT NULL DEFAULT 'in_institution',
  `criteria` JSON NOT NULL, 
  `expected_judges` INT NOT NULL DEFAULT 3,
  `logo_url` VARCHAR(500) DEFAULT NULL,
  `banner_url` VARCHAR(500) DEFAULT NULL,
  `login_config` JSON DEFAULT NULL,
  `created_by` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Activity Judges Assignment (Designate Head Judge per Activity)
CREATE TABLE IF NOT EXISTS `activity_judges` (
  `activity_id` INT NOT NULL,
  `judge_id` INT NOT NULL,
  `is_head_judge` BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (`activity_id`, `judge_id`),
  FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`judge_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Participants/Teams Table
CREATE TABLE IF NOT EXISTS `participants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `activity_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `project_title` VARCHAR(255) DEFAULT NULL,
  `team_members` TEXT DEFAULT NULL,
  `project_url` VARCHAR(512) DEFAULT NULL,
  `attachment_url` VARCHAR(512) DEFAULT NULL,
  `type` ENUM('individual', 'team') NOT NULL DEFAULT 'individual',
  `institution_code` VARCHAR(50) DEFAULT NULL, -- For COI comparison with judges (optional for in-institution)
  `department` VARCHAR(255) DEFAULT NULL,
  `level` VARCHAR(50) DEFAULT NULL,
  `year` VARCHAR(50) DEFAULT NULL,
  `advisors` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Scores Transaction Table (Strict Append-Only)
CREATE TABLE IF NOT EXISTS `transaction_scores` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `activity_id` INT NOT NULL,
  `judge_id` INT NOT NULL,
  `participant_id` INT NOT NULL,
  -- Schema for scores JSON: Maps criteria/subcriteria IDs to values, e.g.:
  -- {"c1": 25.5, "c2": 42.0}
  `scores` JSON NOT NULL,
  `total_score` DECIMAL(8,2) NOT NULL, -- Final aggregated score (pre-calculated based on criteria weights)
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_judge_participant` (`activity_id`, `judge_id`, `participant_id`),
  FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`judge_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Enforce Strict Append-Only Scoring with Triggers
DROP TRIGGER IF EXISTS `prevent_scores_update`;
CREATE TRIGGER `prevent_scores_update` 
BEFORE UPDATE ON `transaction_scores`
FOR EACH ROW 
SIGNAL SQLSTATE '45000' 
SET MESSAGE_TEXT = 'Strict Append-Only Rule violation: Updates are not permitted on transaction_scores.';

DROP TRIGGER IF EXISTS `prevent_scores_delete`;
CREATE TRIGGER `prevent_scores_delete` 
BEFORE DELETE ON `transaction_scores`
FOR EACH ROW 
SIGNAL SQLSTATE '45000' 
SET MESSAGE_TEXT = 'Strict Append-Only Rule violation: Deletions are not permitted on transaction_scores.';

-- 7. System Settings Table (Global Configs like Institution Logo and Name)
CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key` VARCHAR(100) PRIMARY KEY,
  `setting_value` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

