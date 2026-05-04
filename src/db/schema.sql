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
-- DROP TABLE IF EXISTS user_activities;
DROP TABLE IF EXISTS services;
-- DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS areas; -- Added for new schema

-- =============================================================================
-- 2. Area Management (Hierarchy & Navigation)
-- =============================================================================
-- area_id convention:
-- L1 (Region): '00'(全国), '10', '20' ...
-- L2 (Pref/Virtual): '10-13' (Tokyo), '01-V10' (Central Hokkaido)
-- L3 (City/Local): '10-13-A001' (A-code for city), '01-V10-A001' (Local area in Virtual)
-- =============================================================================
CREATE TABLE areas (
    area_id    TEXT PRIMARY KEY,      -- e.g., '00'(全国), '10', '10-08', '10-08-A001'
    name       TEXT NOT NULL,         -- e.g., '関東', '東京都', '道央'
    area_level INTEGER NOT NULL,      -- 0:全国, 1:大エリア(地方), 2:中エリア(都道府県), 3:小エリア(市区町村/仮想)
    lat        REAL,                  -- Representative Latitude (from HeartRails)
    lng        REAL,                  -- Representative Longitude (from HeartRails)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 3. User Management
-- 　[ Disabled to prevent accidental data loss. ]
-- ============================================================================
-- CREATE TABLE IF NOT EXISTS users (
--     user_id       TEXT PRIMARY KEY,               -- Unique ID from Google Auth
--     email         TEXT UNIQUE,                    -- User contact email
--     display_name  TEXT,                           -- Public display name
--     role          TEXT DEFAULT 'USER' NOT NULL,   -- 'USER', 'ADMIN', or 'OWNER'
--     status        TEXT DEFAULT 'ACTIVE' NOT NULL, -- Account status
--     plan_id       TEXT DEFAULT 'free' NOT NULL,   -- 'free', 'pro', or 'biz'
--     last_login_at DATETIME,
--     deleted_at    DATETIME,                       -- Logic delete timestamp
--     created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
-- );

-- =============================================================================
-- 4. Service Locations (Core Data)
-- =============================================================================
CREATE TABLE services (
    service_id      TEXT PRIMARY KEY,
    brand_id        TEXT,                         -- Chain brand identifier
    owner_id        TEXT,                         -- Business owner identifier
    plan_id         TEXT DEFAULT 'free' NOT NULL, -- Service listing plan

    -- New Hierarchy Identifier (Migration Bridge)
    area_id         TEXT,                         -- FK-like logic link to areas.area_id
    
    -- Basic Information
    title           TEXT NOT NULL,                -- Shop or Facility name
    address         TEXT NOT NULL,                -- Full street address
    pref            TEXT,                         -- @deprecated: Prefecture (e.g., '東京都')
    city            TEXT,                         -- @deprecated: Municipality/City (e.g., '新宿区', '札幌市中央区')
    lat             REAL,                         -- Latitude
    lng             REAL,                         -- Longitude

    -- Dynamic Attributes (Wi-Fi, Power, Open Hours, etc.)
    attributes_json TEXT DEFAULT '{}',

    -- Metadata
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at      DATETIME                      -- Logic delete timestamp
);

-- Essential indices for search performance
CREATE INDEX idx_services_area_id ON services(area_id);
CREATE INDEX idx_services_geo ON services(lat, lng);         -- For proximity search

CREATE INDEX idx_services_pref_city ON services(pref, city); -- Legacy support

-- =============================================================================
-- 4. User Activities (Personal Data)
-- 　[ Disabled to prevent accidental data loss. ]
-- =============================================================================
-- CREATE TABLE IF NOT EXISTS user_activities (
--     activity_id    TEXT PRIMARY KEY,
--     user_id        TEXT NOT NULL,
--     service_id     TEXT NOT NULL,
    
--     -- Interaction Records
--     favorited_at   DATETIME,                      -- Timestamp for "Saved"
--     visited_at     DATETIME,                      -- Last visit timestamp
    
--     -- Personal Notes
--     tentative_date TEXT,                          -- Planned visit date
--     personal_memo  TEXT,                          -- Private user notes
    
--     updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
--     UNIQUE(user_id, service_id)                   -- Prevent duplicate entries
-- );
