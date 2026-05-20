/**
 * [File Path] src/db/queries/transformers.ts
 */
import { isTruthy } from './utils';

const MAX_TAG_DISPLAY = 4;  // 営業時間＋タグ3つ

// 特徴的な項目
export const UNIQUE_FEATURES = [
  { key: 'buffet', label: 'ドーナツ食べ放題' },
  { key: 'pop_buffet', label: 'ドーナツポップ詰め放題' },
  { key: 'cash_only', label: '現金のみ' },
  { key: 'baby', label: 'ベビーカーOK' },
] as const;

// 普遍的な項目
export const INFRA_FEATURES = [
  { key: 'free_refill', label: 'ドリンクおかわり無料' },
  { key: 'takeout', label: 'テイクアウト' },
  { key: 'parking', label: '駐車場' },
  { key: 'outlets', label: '電源' },
  // { key: 'wifi', label: 'Wi-Fi' }, // Wi-Fi普及に伴い非表示に変更
] as const;

export const formatAttributes = (jsonStr: string): string[] => {
  try {
    const attrs = JSON.parse(jsonStr || '{}');
    const tags: string[] = [];

    // --- 1. 営業時間 ---
    if (attrs.business_hours && typeof attrs.business_hours === 'string') {
      const hours = attrs.business_hours;
      if (hours.length > 0 && hours.length <= 12) {
        tags.push(hours);
      }
    }

    // --- 2. 特徴的な項目 (食べ放題、詰め放題、おかわり自由、赤ちゃんOKなど) ---
    for (const item of UNIQUE_FEATURES) {
      if (tags.length < MAX_TAG_DISPLAY && isTruthy(attrs[item.key])) {
        tags.push(item.label);
      }
    }

    // --- 4. 普遍的な項目 (駐車場、電源、Wi-Fi、喫煙室あり) ---
    for (const item of INFRA_FEATURES) {
      if (tags.length >= MAX_TAG_DISPLAY) break;
        // 通常の boolean 項目（wifi, outlets など）
        if (isTruthy(attrs[item.key])) {
          tags.push(item.label);
        }
    }

    return tags.slice(0, MAX_TAG_DISPLAY);
  } catch {
    return [];
  }
};