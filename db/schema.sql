-- FPL Data Lab (FFootball) schema.
-- Apply with: mysql -u root ffootball < db/schema.sql
-- (or paste into phpMyAdmin against an existing empty database).

CREATE DATABASE IF NOT EXISTS ffootball
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ffootball;

-- Accounts. Roles: student < teacher < admin.
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  display_name  VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('student','teacher','admin') NOT NULL DEFAULT 'student',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One workspace per student. The LONGTEXT fields are the student's work.
CREATE TABLE workspaces (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL UNIQUE,
  jsx_code   LONGTEXT NULL,
  css_code   LONGTEXT NULL,
  notes      LONGTEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
             ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ws_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

-- Safety net: last 20 saves per student (server prunes older rows).
CREATE TABLE workspace_backups (
  id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id  INT UNSIGNED NOT NULL,
  jsx_code LONGTEXT NULL,
  css_code LONGTEXT NULL,
  notes    LONGTEXT NULL,
  saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_bk_user (user_id, saved_at),
  CONSTRAINT fk_bk_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

-- System settings editable by admin (fpl_base_url, cache_ttl_seconds).
CREATE TABLE settings (
  setting_key   VARCHAR(50) PRIMARY KEY,
  setting_value TEXT NOT NULL
);

-- FPL proxy cache. bootstrap-static payload is ~2 MB, hence LONGTEXT.
CREATE TABLE fpl_cache (
  endpoint   VARCHAR(120) PRIMARY KEY,
  payload    LONGTEXT  NOT NULL,
  fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO settings (setting_key, setting_value) VALUES
  ('fpl_base_url', 'https://fantasy.premierleague.com/api'),
  ('cache_ttl_seconds', '900')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
