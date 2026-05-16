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
DROP TABLE IF EXISTS areas; 

-- Station Master Tables
DROP TABLE IF EXISTS station_join;
DROP TABLE IF EXISTS stations;
DROP TABLE IF EXISTS lines;
DROP TABLE IF EXISTS companies;

-- =============================================================================
-- 2. エリア管理 (階層構造とナビゲーション)
-- =============================================================================
-- area_id 命名規則:
-- L1 (大エリア/地方): '00'(全国), '10', '20' ...
-- L2 (中エリア/都道府県/仮想): '10-13' (東京都), '01-V10' (道央)
-- L3 (小エリア/市区町村/詳細): '10-13-A001' (市区町村), '01-V10-A001' (仮想エリア内詳細)
-- -----------------------------------------------------------------------------
-- L1 から L2 への対応リファレンス (L1: 地方コード, L2: 都道府県JISコード)
-- 01:北海道 (V10-40) | 02:東北 (02-07) | 10:関東 (08-14) | 20:中部 (15-23)
-- 30:近畿   (24-30)   | 40:中国 (31-35) | 50:四国 (36-39) | 60:九州・沖縄 (40-47)
-- =============================================================================

CREATE TABLE areas (
    area_id    TEXT PRIMARY KEY,      -- e.g., '00'(全国), '10', '10-08', '10-08-A001'
    name       TEXT NOT NULL,         -- e.g., '関東', '東京都', '道央'
    area_level INTEGER NOT NULL,      -- 0:全国, 1:大エリア(地方), 2:中エリア(都道府県), 3:小エリア(市区町村/詳細)
    lat        REAL,                  -- 代表緯度 (HeartRails等から取得)
    lng        REAL,                  -- 代表経度 (HeartRails等から取得)
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
--     deleted_at    DATETIME,                        -- Logic delete timestamp
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
    lat             REAL,                         -- Latitude
    lng             REAL,                         -- Longitude

-- Availability Schedule (iCalendar-based JSON)
    -- -------------------------------------------------------------------------
    -- 構造例: {"base": [{"days": ["MO"], "slots": [{"start": "07:00", "end": "12:00"}]}], "exclude_holidays": true}
    -- ⚠️ システム判定用のプライマリソース。臨時変更等を除いた基本営業枠を定義。
    -- -------------------------------------------------------------------------
    schedule_json   TEXT DEFAULT '{}',

    -- Dynamic Attributes (JSON format)
    -- -------------------------------------------------------------------------
    -- 以下のキー名に厳選し、表記揺れを禁止する（未確定時は項目自体を省略または null）:
    -- - category       : (string)  'cat_cafe', 'cat_restaurant', 'cat_bar' など
    -- - wifi           : (boolean) Wi-Fiの有無
    -- - outlets        : (boolean) 電源の有無
    -- - parking        : (boolean) 専用・提携駐車場の有無
    -- - takeout        : (boolean) テイクアウト・お持ち帰り対応の有無
    -- - smoking        : (string)  喫煙ステータス ('NO_SMOKING', 'SMOKING_ROOM', 'SMOKING_SEATS', 'ALL_SMOKING')
    -- - payment        : (array)   決済手段。'CASH_ONLY'、'PayPay'、および主要区分 ('CREDIT', 'E_MONEY', 'QR') を許可
    -- - buffet         : (boolean) 食べ放題（ミスドビュッフェ等）の有無
    -- - pop_buffet     : (boolean) ドーナツポップ詰め放題の有無
    -- - free_refill    : (boolean) ドリンクおかわり自由（コーヒー・カフェオレ等）の有無
    -- - baby           : (boolean) 赤ちゃん対応・ベビーカー入店の可否
    -- - business_hours : (string)  基本営業時間（例: '09:00〜21:00' ※予備・フロント表示用）
    -- -------------------------------------------------------------------------
    attributes_json TEXT DEFAULT '{}',

    -- Metadata
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at      DATETIME                      -- Logic delete timestamp
);

-- Essential indices for search performance
CREATE INDEX idx_services_area_id ON services(area_id);
CREATE INDEX idx_services_geo ON services(lat, lng);         -- For proximity search

-- =============================================================================
-- 5. Station Master (Railway Data)
-- =============================================================================

CREATE TABLE companies (
    company_cd     INTEGER PRIMARY KEY,
    rr_cd          INTEGER NOT NULL,
    company_name   TEXT NOT NULL,
    company_name_k TEXT,
    company_name_h TEXT,
    company_name_r TEXT,
    company_url    TEXT,
    company_type INTEGER, -- 1:JR, 2:大手私鉄, 3:準大手私鉄...
    e_status     INTEGER DEFAULT 0, -- 0:運用中, 1:運用前, 2:廃止
    e_sort         INTEGER
);

CREATE TABLE lines (
    line_cd      INTEGER PRIMARY KEY,
    company_cd   INTEGER NOT NULL,
    line_name    TEXT NOT NULL,
    line_name_k  TEXT,
    line_name_h  TEXT,
    line_color_c TEXT,    -- 十六進位カラーコード (例: 'ff0000')
    line_color_t TEXT,    -- 路線記号/テキスト
    line_type    INTEGER, -- 1:新幹線, 2:一般鉄道, 3:地下鉄...
    lon          REAL,    -- 路線代表地点（中心）
    lat          REAL,
    zoom         INTEGER,
    e_status     INTEGER DEFAULT 0,
    e_sort       INTEGER,
    FOREIGN KEY (company_cd) REFERENCES companies(company_cd)
);

CREATE TABLE stations (
    station_cd     INTEGER PRIMARY KEY,
    station_g_cd   INTEGER NOT NULL, -- Group ID for transferring stations
    station_name   TEXT NOT NULL,
    station_name_k TEXT,
    station_name_r TEXT,
    line_cd        INTEGER NOT NULL,
    pref_cd        INTEGER,
    post           TEXT,
    address        TEXT,
    lon          REAL NOT NULL,    -- 経度 (X) ※システム内では 'lng' として扱う
    lat          REAL NOT NULL,    -- 緯度 (Y)
    open_ymd       TEXT,
    close_ymd      TEXT,
    e_status       INTEGER DEFAULT 0,
    e_sort         INTEGER,
    FOREIGN KEY (line_cd) REFERENCES lines(line_cd)
);

CREATE TABLE station_join (
    line_cd      INTEGER NOT NULL,
    station_cd1  INTEGER NOT NULL,
    station_cd2  INTEGER NOT NULL,
    PRIMARY KEY (line_cd, station_cd1, station_cd2)
);

-- Essential indices for station search performance
CREATE INDEX idx_stations_geo ON stations(lat, lon);
CREATE INDEX idx_stations_group ON stations(station_g_cd);
CREATE INDEX idx_stations_line ON stations(line_cd);

-- =============================================================================
-- 6. User Activities (Personal Data)
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