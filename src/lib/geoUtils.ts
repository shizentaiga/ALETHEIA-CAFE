/**
 * 座標データのバリデーション
 * 日本の緯度（約20-46度）と経度（約122-154度）の範囲内かチェックする
 */
export const isValidCoordinates = (lat: number, lng: number): boolean => {
  return lat >= 20 && lat <= 50 && lng >= 120 && lng <= 155;
};

/**
 * [将来用] 2点間の距離をメートル単位で計算する（Haversine公式）
 * ※DBでのソートは近似計算で十分ですが、UI上で「現在地から○km」と出したい場合に使用。
 */
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
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