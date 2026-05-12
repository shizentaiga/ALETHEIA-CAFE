// src/lib/geoUtils.ts

// ==========================================
// #region 1. 座標計算・バリデーション
// ==========================================

/**
 * 指定された座標が日本国内の範囲内かどうかを判定します。
 * 緯度: 南端 約20.4度 〜 北端 約45.5度（択捉島）
 * 経度: 西端 約122.9度（与那国島） 〜 東端 約153.9度（南鳥島）
 */
export const isValidCoordinates = (lat: number, lng: number): boolean => {
  return lat >= 20.4 && lat <= 45.6 && lng >= 122.9 && lng <= 154.0;
};

/**
 * 2点間の距離をメートル単位で計算する（Haversine公式）
 * ※DBでのソートは近似計算で十分ですが、UI上で「現在地から○km」と出したい場合に使用。
 */
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  // 数値誤差によるエラーをガード
  if (lat1 === lat2 && lng1 === lng2) return 0;

  const R = 6371000; // 地球の半径 (m)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * 2点間の座標から方位（8方位）を判定し、記号とラベルを返します。
 * @param lat1 基準点(駅)の緯度
 * @param lng1 基準点(駅)の経度
 * @param lat2 対象点(ショップ)の緯度
 * @param lng2 対象点(ショップ)の経度
 */
export const getDirection = (lat1: number, lng1: number, lat2: number, lng2: number): { arrow: string; label: string } => {
  // 緯度経度の差分 (2が対象、1が基準)
  const dy = lat2 - lat1;
  const dx = lng2 - lng1;

  // Math.atan2(dx, dy) で「北(dyプラス)を0度」とした角度を取得
  // ラジアンから度への変換
  let degree = (Math.atan2(dx, dy) * 180) / Math.PI;

  // degreeは -180 〜 180 で返るため、0 〜 360 に補正
  if (degree < 0) {
    degree = degree + 360;
  }

  // 8方位の定義
  const directions = [
    { label: '北', arrow: '↑' },
    { label: '北東', arrow: '↗' },
    { label: '東', arrow: '→' },
    { label: '南東', arrow: '↘' },
    { label: '南', arrow: '↓' },
    { label: '南西', arrow: '↙' },
    { label: '西', arrow: '←' },
    { label: '北西', arrow: '↖' },
  ];

  // 45度刻みでインデックスを特定 (22.5度オフセットして丸める)
  const index = Math.round(degree / 45) % 8;
  return directions[index];
};

// #endregion


// ==========================================
// #region 2. 設定・型定義
// ==========================================

const CONFIG = {
  WALK_SPEED_PER_MIN: 80,    // 80m/分
  CAR_SPEED_PER_MIN: 400,    // 400m/分
  DETOUR_FACTOR: 1.25,       // 直線距離 -> 道路距離 補正
  WALK_LIMIT_MIN: 20,        // 徒歩表示の閾値
} as const;

export type AccessInfo = {
  mode: 'walk' | 'car' | 'far';
  minutes: number;           // 選択されたモードの所要時間
  walkMinutes: number;       // (汎用用) 常に計算される徒歩分数
  roadDistance: number;      // 推定道路距離(m)
  distanceText: string;      // 読みやすい距離表記 (例: "800m", "1.2km")
  text: string;              // そのまま表示できるテキスト (例: "徒歩5分")
};

// #endregion


// ==========================================
// #region 3. アクセス時間表示・整形
// ==========================================

/**
 * 距離を読みやすい形式に変換 (例: 850 -> "850m", 1200 -> "1.2km")
 */
export const formatDistanceText = (m: number): string => {
  const roundedM = Math.round(m);
  return roundedM < 1000 ? `${roundedM}m` : `${(roundedM / 1000).toFixed(1)}km`;
};

/**
 * 直線距離(m)と駅名から、最適なアクセス表記文字列を生成する。
 * 1分以内は方角非表示、2分以上は方角記号を先頭に付与。
 * 
 * @example "↓ 小岩駅 徒歩3分" / "小岩駅 すぐ"
 */
export const formatAccessTime = (
  distanceMeters: number,
  lat1?: number, lng1?: number, lat2?: number, lng2?: number,
): AccessInfo => {
  // 0. 基本データの算出
  const safeDistance = Math.max(0, distanceMeters);
  const roadDistance = Math.round(safeDistance * CONFIG.DETOUR_FACTOR);
  const distanceText = formatDistanceText(roadDistance);
  const walkMinutes = Math.ceil(roadDistance / CONFIG.WALK_SPEED_PER_MIN);

  // --- 1. 方角記号(矢印)の構築 ---
  let arrowPrefix = '';
  // 徒歩2分以上かつ、座標が揃っている場合のみ方角を計算
  if (walkMinutes > 1 && lat1 !== undefined && lng1 !== undefined && lat2 !== undefined && lng2 !== undefined) {
    const dir = getDirection(lat1, lng1, lat2, lng2);
    arrowPrefix = `${dir.arrow} `; // 例: "↓ "
  }

  // --- 2. 駅名パーツの構築 ---
  // const namePart = stationName ? `${stationName}駅 ` : '';

  // --- 3. 徒歩モードを基準とした初期設定 ---
  const info: AccessInfo = {
    mode: 'walk',
    minutes: walkMinutes,
    walkMinutes: walkMinutes,
    roadDistance: roadDistance,
    distanceText: distanceText,
    text: walkMinutes <= 0 
      ? `すぐ` 
      : `${arrowPrefix}徒歩${walkMinutes}分`
  };

  // --- 4. 特殊ケースおよび車モードの判定 ---
  if (distanceMeters < 0) {
    info.mode = 'far';
    info.text = '距離不明';
    return info;
  }

  // 徒歩圏内(20分以内)であればそのまま返却
  if (walkMinutes <= CONFIG.WALK_LIMIT_MIN) {
    return info;
  }

  // 車モードの計算とテキスト更新
  const carMinutes = Math.ceil(roadDistance / CONFIG.CAR_SPEED_PER_MIN);
  info.mode = 'car';
  info.minutes = carMinutes;
  info.text = `${arrowPrefix}車${carMinutes}分`;

  // 4. 極端に遠い場合
  if (carMinutes > 60) {
    info.mode = 'far';
    info.text = '車で1時間以上';
  }

  return info;
};

// #endregion