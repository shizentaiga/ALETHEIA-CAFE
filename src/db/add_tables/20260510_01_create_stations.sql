-- npx wrangler d1 execute ALETHEIA_CAFE_DB --file=./src/db/add_tables/20260510_01_create_stations.sql --local

-- =============================================================================
-- 【 ALETHEIA - Station Master Schema 】
-- Goal: Manage Railway Companies, Lines, and Stations for proximity search.
-- Reference: 駅データ.jp (ekidata.jp) format
-- =============================================================================

-- 1. Table Initialization
DROP TABLE IF EXISTS station_join;
DROP TABLE IF EXISTS stations;
DROP TABLE IF EXISTS lines;
DROP TABLE IF EXISTS companies;

-- =============================================================================
-- 2. Railway Companies (鉄道会社)
-- =============================================================================
CREATE TABLE companies (
    company_cd   INTEGER PRIMARY KEY,
    rr_cd        INTEGER NOT NULL,
    company_name TEXT NOT NULL,
    company_name_k TEXT,
    company_name_h TEXT,
    company_name_r TEXT,
    company_url  TEXT,
    company_type INTEGER, -- 1:JR, 2:大手私鉄, 3:準大手私鉄...
    e_status     INTEGER DEFAULT 0, -- 0:運用中, 1:運用前, 2:廃止
    e_sort       INTEGER
);

-- =============================================================================
-- 3. Railway Lines (路線)
-- =============================================================================
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

-- =============================================================================
-- 4. Stations (駅)
-- =============================================================================
CREATE TABLE stations (
    station_cd   INTEGER PRIMARY KEY,
    station_g_cd INTEGER NOT NULL, -- 重要: 同一駅（乗換駅）を束ねるグループコード
    station_name TEXT NOT NULL,
    station_name_k TEXT,
    station_name_r TEXT,
    line_cd      INTEGER NOT NULL,
    pref_cd      INTEGER,
    post         TEXT,
    address      TEXT,
    lon          REAL NOT NULL,    -- 経度 (X)
    lat          REAL NOT NULL,    -- 緯度 (Y)
    open_ymd     TEXT,
    close_ymd    TEXT,
    e_status     INTEGER DEFAULT 0,
    e_sort       INTEGER,
    FOREIGN KEY (line_cd) REFERENCES lines(line_cd)
);

-- Essential indices for proximity search & group grouping
CREATE INDEX idx_stations_geo ON stations(lat, lon); -- 最寄駅計算用（高速化の肝）
CREATE INDEX idx_stations_group ON stations(station_g_cd); -- 同一駅名集約用
CREATE INDEX idx_stations_line ON stations(line_cd); -- 路線別検索用

-- =============================================================================
-- 5. Station Connections (駅間接続)
-- =============================================================================
CREATE TABLE station_join (
    line_cd      INTEGER NOT NULL,
    station_cd1  INTEGER NOT NULL,
    station_cd2  INTEGER NOT NULL,
    PRIMARY KEY (line_cd, station_cd1, station_cd2)
);