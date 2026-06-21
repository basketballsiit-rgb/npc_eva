-- Seed Users (Passwords are hashed 'password123')
-- Bcrypt hash for 'password123': $2a$10$GECfWhHz0/p/E3BB2uxBj.2zcjKDQIdjOoiG8Rzq.yvJ4yX1c2hWm
INSERT INTO `users` (`username`, `password_hash`, `fullname`, `role`, `institution_code`, `status`) VALUES
('admin', '$2a$10$GECfWhHz0/p/E3BB2uxBj.2zcjKDQIdjOoiG8Rzq.yvJ4yX1c2hWm', 'Central Administrator', 'admin', 'NPC', 'active'),
('judge1', '$2a$10$GECfWhHz0/p/E3BB2uxBj.2zcjKDQIdjOoiG8Rzq.yvJ4yX1c2hWm', 'Dr. Somchai (Head Judge)', 'judge', 'NPC', 'active'),
('judge2', '$2a$10$GECfWhHz0/p/E3BB2uxBj.2zcjKDQIdjOoiG8Rzq.yvJ4yX1c2hWm', 'Ajarn Somsak', 'judge', 'CTC', 'active'),
('judge3', '$2a$10$GECfWhHz0/p/E3BB2uxBj.2zcjKDQIdjOoiG8Rzq.yvJ4yX1c2hWm', 'Dr. Vipawan', 'judge', 'PTC', 'active');

-- Seed Activities
INSERT INTO `activities` (`id`, `title`, `description`, `start_date`, `end_date`, `location`, `host_organization`, `status`, `scoring_algorithm`, `competition_type`, `criteria`, `expected_judges`, `created_by`) VALUES
(1, 'Innovative IoT Project Competition', 'Annual Northern Thailand Polytechnic IoT innovation challenge.', '2026-06-21 09:00:00', '2026-06-25 17:00:00', 'Building 4, NPC', 'Nan Polytechnic College', 'Active', 'coi_prevention', 'out_institution',
'[
  {
    "id": "crit_1",
    "name": "ความคิดสร้างสรรค์และนวัตกรรม (Creativity & Innovation)",
    "max_score": 30.0,
    "weight": 1.0,
    "children": [
      { "id": "crit_1_1", "name": "ความแปลกใหม่และสร้างสรรค์ (Originality)", "max_score": 15, "weight": 1.0, "children": [] },
      { "id": "crit_1_2", "name": "คุณค่าและประโยชน์การใช้งาน (Impact & Value)", "max_score": 15, "weight": 1.0, "children": [] }
    ]
  },
  {
    "id": "crit_2",
    "name": "การออกแบบและเทคนิคที่เลือกใช้ (Technical Design & Feasibility)",
    "max_score": 40.0,
    "weight": 1.2,
    "children": [
      { "id": "crit_2_1", "name": "การออกแบบฮาร์ดแวร์ (Hardware Design)", "max_score": 20, "weight": 1.0, "children": [] },
      { "id": "crit_2_2", "name": "การพัฒนาซอฟต์แวร์และการเชื่อมต่อ (Software Integration)", "max_score": 20, "weight": 1.0, "children": [] }
    ]
  },
  {
    "id": "crit_3",
    "name": "การนำเสนอและการตอบข้อซักถาม (Presentation & Q&A)",
    "max_score": 30,
    "weight": 0.8,
    "children": []
  }
]', 3, 1),
(2, 'Robotics Championship 2026', 'National vocational robotics battle.', '2026-07-10 09:00:00', '2026-07-12 18:00:00', 'NPC Arena', 'Nan Polytechnic College', 'Draft', 'standard_average', 'in_institution',
'[
  {"id": "crit_1", "name": "ความเร็วและประสิทธิภาพ (Speed)", "max_score": 50, "weight": 1.5, "children": []},
  {"id": "crit_2", "name": "ความแข็งแรงเชิงกลไก (Mechanics)", "max_score": 30, "weight": 1.0, "children": []},
  {"id": "crit_3", "name": "คุณภาพของซอร์สโค้ด (Code Quality)", "max_score": 20, "weight": 0.5, "children": []}
]', 3, 1);

-- Assign Judges to Activity 1 (Innovative IoT Project Competition)
INSERT INTO `activity_judges` (`activity_id`, `judge_id`, `is_head_judge`) VALUES
(1, 2, FALSE), -- Judge 1: Dr. Somchai (NPC) is Head Judge
(1, 3, FALSE),
(1, 4, FALSE);
UPDATE `activity_judges` SET `is_head_judge` = TRUE WHERE `activity_id` = 1 AND `judge_id` = 2; -- Make judge1 (id 2) head judge

-- Seed Participants for Activity 1
INSERT INTO `participants` (`id`, `activity_id`, `name`, `type`, `institution_code`) VALUES
(1, 1, 'Team Alpha (IoT Smart Farm)', 'team', 'NPC'),
(2, 1, 'Team Beta (Smart Home automation)', 'team', 'CTC'),
(3, 1, 'Team Gamma (Autonomous Drone)', 'team', 'PTC');

-- Seed System Settings
INSERT INTO `system_settings` (`setting_key`, `setting_value`) VALUES
('institution_logo', ''),
('institution_name', 'วิทยาลัยสารพัดช่างน่าน');
