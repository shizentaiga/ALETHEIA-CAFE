// src/lib/geoUtils.ts

/**
 * 日本の座標データのバリデーション
 * 緯度：南端は約20.4度、北端（択捉島）は約45.5度
 * 経度：西端（与那国島）は約122.9度、東端（南鳥島）は約153.9度
 */
export const isValidCoordinates = (lat: number, lng: number): boolean => {
  return lat >= 20.4 && lat <= 45.6 && lng >= 122.9 && lng <= 154.0;
};

/**
 * [将来用] 2点間の距離をメートル単位で計算する（Haversine公式）
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

// src/lib/geoUtils.ts

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

/**
 * 距離を読みやすい形式に変換 (例: 850 -> "850m", 1200 -> "1.2km")
 */
export const formatDistanceText = (m: number): string => {
  const roundedM = Math.round(m);
  return roundedM < 1000 ? `${roundedM}m` : `${(roundedM / 1000).toFixed(1)}km`;
};

/**
 * 直線距離(m)から最適なアクセス表記を生成する
 */
export const formatAccessTime = (distanceMeters: number): AccessInfo => {
  // 0. 基本データの算出
  const safeDistance = Math.max(0, distanceMeters);
  const roadDistance = Math.round(safeDistance * CONFIG.DETOUR_FACTOR);
  const distanceText = formatDistanceText(roadDistance);
  const walkMinutes = Math.ceil(roadDistance / CONFIG.WALK_SPEED_PER_MIN);

  // 初期値（徒歩モード）の設定
  const info: AccessInfo = {
    mode: 'walk',
    minutes: walkMinutes,
    walkMinutes: walkMinutes,
    roadDistance: roadDistance,
    distanceText: distanceText,
    text: walkMinutes <= 0 ? 'すぐ' : `徒歩${walkMinutes}分`
  };

  // 1. 不正または極端に近い場合
  if (distanceMeters < 0) {
    info.mode = 'far';
    info.text = '距離不明';
    return info;
  }

  // 2. 徒歩圏内の場合（そのまま返却）
  if (walkMinutes <= CONFIG.WALK_LIMIT_MIN) {
    return info;
  }

  // 3. 車モードの計算
  const carMinutes = Math.ceil(roadDistance / CONFIG.CAR_SPEED_PER_MIN);
  info.mode = 'car';
  info.minutes = carMinutes;
  info.text = `車${carMinutes}分`;

  // 4. 極端に遠い場合
  if (carMinutes > 60) {
    info.mode = 'far';
    info.text = '車で1時間以上';
  }

  return info;
};