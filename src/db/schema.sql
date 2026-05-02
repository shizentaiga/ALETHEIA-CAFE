-- =============================================================================
-- [ COMMAND MEMO ]
-- Create DB:       npx wrangler d1 create ALETHEIA-CAFE-DB
-- Deploy Schema:   npx wrangler d1 execute ALETHEIA_CAFE_DB --file=./src/db/schema.sql --local
-- =============================================================================

/**
 * =============================================================================
 * 【 ALETHEIA - Database Schema 】
 * Goal: Manage Users, Locations (Services), and Personal Activities.
 * DB Name: ALETHEIA-CAFE-DB
 * =============================================================================
 */

-- =============================================================================
-- 1. Table Initialization
-- =============================================================================
DROP TABLE IF EXISTS user_activities;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS users;

-- =============================================================================
-- 2. User Management
-- =============================================================================
CREATE TABLE users (
    user_id       TEXT PRIMARY KEY,               -- Unique ID from Google Auth
    email         TEXT UNIQUE,                    -- User contact email
    display_name  TEXT,                           -- Public display name
    role          TEXT DEFAULT 'USER' NOT NULL,   -- 'USER', 'ADMIN', or 'OWNER'
    status        TEXT DEFAULT 'ACTIVE' NOT NULL, -- Account status
    plan_id       TEXT DEFAULT 'free' NOT NULL,   -- 'free', 'pro', or 'biz'
    last_login_at DATETIME,
    deleted_at    DATETIME,                       -- Logic delete timestamp
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 3. Service Locations (Core Data)
-- =============================================================================
CREATE TABLE services (
    service_id      TEXT PRIMARY KEY,
    brand_id        TEXT,                         -- Chain brand identifier
    owner_id        TEXT,                         -- Business owner identifier
    plan_id         TEXT DEFAULT 'free' NOT NULL, -- Service listing plan
    
    -- Basic Information
    title           TEXT NOT NULL,                -- Shop or Facility name
    address         TEXT NOT NULL,                -- Full street address
    pref            TEXT,                         -- Prefecture (e.g., '東京都')
    city            TEXT,                         -- Municipality/City (e.g., '新宿区', '札幌市中央区')
    lat             REAL,                         -- Latitude
    lng             REAL,                         -- Longitude

    -- Dynamic Attributes (Wi-Fi, Power, Open Hours, etc.)
    attributes_json TEXT DEFAULT '{}',

    -- Metadata
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at      DATETIME                      -- Logic delete timestamp
);

-- Index for high-speed area-based searches
CREATE INDEX idx_services_pref_city ON services(pref, city);

-- =============================================================================
-- 4. User Activities (Personal Data)
-- =============================================================================
CREATE TABLE user_activities (
    activity_id    TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL,
    service_id     TEXT NOT NULL,
    
    -- Interaction Records
    favorited_at   DATETIME,                      -- Timestamp for "Saved"
    visited_at     DATETIME,                      -- Last visit timestamp
    
    -- Personal Notes
    tentative_date TEXT,                          -- Planned visit date
    personal_memo  TEXT,                          -- Private user notes
    
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, service_id)                   -- Prevent duplicate entries
);