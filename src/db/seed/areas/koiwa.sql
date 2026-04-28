/**
 * [ALETHEIA] Area Seed Data - Koiwa (koiwa.sql)
 * 役割：新 schema.sql（2026-04版）に基づく小岩エリアの実データ投入
 */

-- 1. アヤスカフェ小岩
INSERT OR REPLACE INTO services (
    service_id, 
    brand_id, 
    owner_id, 
    plan_id, 
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
    , 'アヤスカフェ小岩'
    , '東京都江戸川区南小岩8丁目11-8 ウイルコート小岩1F'
    , 35.731720
    , 139.882140
    , json_object(
        'wifi', true
        , 'baby', true
        , 'payment', json_array('PayPay', 'Rakuten Pay', 'JCB', 'AMEX')
        , 'ext_place_id', 'GOOGLE_PLACE_AYAS_KOIWA'
        , 'prefecture', '東京都'
        , 'city', '江戸川区'
    )
);

-- 2. 地域活動支援センターこいわ～cafe bloom～
INSERT OR REPLACE INTO services (
    service_id, 
    brand_id, 
    owner_id, 
    plan_id, 
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
    , '地域活動支援センターこいわ ～cafe bloom～'
    , '東京都江戸川区南小岩7丁目19-7 MACOビル2階'
    , 35.733210
    , 139.880560
    , json_object(
        'wifi', true
        , 'payment', json_array('CASH_ONLY')
        , 'outlets', true
        , 'ext_place_id', 'GOOGLE_PLACE_CAFE_BLOOM'
        , 'prefecture', '東京都'
        , 'city', '江戸川区'
        , 'type', 'Medical/Welfare Counselor'
    )
);

-- 3. サンライズ・カフェ
INSERT OR REPLACE INTO services (
    service_id, 
    brand_id, 
    owner_id, 
    plan_id, 
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
    , 'サンライズ・カフェ'
    , '東京都江戸川区東小岩6丁目18-17'
    , 35.734780
    , 139.888560
    , json_object(
        'payment', json_array('PayPay')
        , 'prefecture', '東京都'
        , 'city', '江戸川区'
        , 'ext_place_id', 'GOOGLE_PLACE_SUNRISE_CAFE'
    )
);

-- 4. コモン・カフェ
INSERT OR REPLACE INTO services (
    service_id, 
    brand_id, 
    owner_id, 
    plan_id, 
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
    , 'コモン・カフェ'
    , '東京都江戸川区西小岩1丁目27'
    , 35.735150
    , 139.881230
    , json_object(
        'payment', json_array('PayPay')
        , 'prefecture', '東京都'
        , 'city', '江戸川区'
    )
);