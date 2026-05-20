-- npx wrangler d1 execute ALETHEIA_CAFE_DB --file=./src/db/seed/shops/koiwa.sql --local

/**
 * [ALETHEIA] Area Seed Data - Koiwa (koiwa.sql)
 * 役割：新 schema.sql（2026-04版）に基づく小岩エリアの実データ投入
 * カラム構成: pref, city を廃止し、area_id を導入
 */

-- npx wrangler d1 execute ALETHEIA_CAFE_DB --file=./src/db/seed/shops/koiwa.sql --local

-- 1. アヤスカフェ小岩
INSERT OR REPLACE INTO services (
    service_id, 
    brand_id, 
    owner_id, 
    plan_id, 
    area_id,
    title, 
    address, 
    lat, 
    lng, 
    attributes_json
) VALUES (
    'SRV_KOIWA_AYAS_001'
    , NULL
    , NULL
    , 'free'
    , (SELECT area_id FROM areas WHERE name = '江戸川区' AND area_level = 3 LIMIT 1)
    , 'アヤスカフェ小岩'
    , '東京都江戸川区南小岩8丁目11-8 ウイルコート小岩1F'
    , 35.7329303
    , 139.8816307
    , json_object(
        'cash_only', false
        , 'business_hours', '11:00～16:00'
        , 'baby', true
        , 'wifi', true
        , 'ext_place_id', 'GOOGLE_PLACE_AYAS_KOIWA'
        , 'category', 'cat_cafe'
    )
);

-- 2. 地域活動支援センターこいわ～cafe bloom～
INSERT OR REPLACE INTO services (
    service_id, 
    brand_id, 
    owner_id, 
    plan_id, 
    area_id,
    title, 
    address, 
    lat, 
    lng, 
    attributes_json
) VALUES (
    'SRV_KOIWA_BLOOM_002'
    , NULL
    , NULL
    , 'free'
    , (SELECT area_id FROM areas WHERE name = '江戸川区' AND area_level = 3 LIMIT 1)
    , '地域活動支援センターこいわ ～cafe bloom～'
    , '東京都江戸川区南小岩7丁目19-7 MACOビル2階'
    , 35.7310024
    , 139.8803454
    , json_object(
        'cash_only', false
        , 'business_hours', '10:00～17:00'
        , 'wifi', true
        , 'outlets', true
        , 'ext_place_id', 'GOOGLE_PLACE_CAFE_BLOOM'
        , 'category', 'cat_cafe'
    )
);

-- 3. サンライズ・カフェ
INSERT OR REPLACE INTO services (
    service_id, 
    brand_id, 
    owner_id, 
    plan_id, 
    area_id,
    title, 
    address, 
    lat, 
    lng, 
    attributes_json
) VALUES (
    'SRV_KOIWA_SUNRISE_003'
    , NULL
    , NULL
    , 'free'
    , (SELECT area_id FROM areas WHERE name = '江戸川区' AND area_level = 3 LIMIT 1)
    , 'サンライズ・カフェ'
    , '東京都江戸川区東小岩6丁目18-17'
    , 35.733901
    , 139.8859927
    , json_object(
        'cash_only', false
        , 'business_hours', '9:30～18:00'
        , 'ext_place_id', 'GOOGLE_PLACE_SUNRISE_CAFE'
        , 'category', 'cat_cafe'
    )
);

-- 4. コモン・カフェ
INSERT OR REPLACE INTO services (
    service_id, 
    brand_id, 
    owner_id, 
    plan_id, 
    area_id,
    title, 
    address, 
    lat, 
    lng, 
    attributes_json
) VALUES (
    'SRV_KOIWA_COMMON_004'
    , NULL
    , NULL
    , 'free'
    , (SELECT area_id FROM areas WHERE name = '江戸川区' AND area_level = 3 LIMIT 1)
    , 'コモン・カフェ'
    , '東京都江戸川区西小岩1丁目27'
    , 35.7347552
    , 139.8799785
    , json_object(
       'cash_only', false
        , 'business_hours', '10:00～19:00'
        , 'category', 'cat_cafe'
    )
);

-- 5. コーヒーパーラー レモン
INSERT OR REPLACE INTO services (
    service_id, 
    brand_id, 
    owner_id, 
    plan_id, 
    area_id,
    title, 
    address, 
    lat, 
    lng, 
    attributes_json
) VALUES (
    'SRV_KOIWA_LEMON_005'
    , NULL
    , NULL
    , 'free'
    , (SELECT area_id FROM areas WHERE name = '江戸川区' AND area_level = 3 LIMIT 1)
    , 'コーヒーパーラー レモン'
    , '東京都江戸川区南小岩6丁目25-14'
    , 35.7280417
    , 139.8791536
    , json_object(
        'cash_only', true
        , 'business_hours', '12:00～19:00'
        , 'category', 'cat_cafe'
    )
);