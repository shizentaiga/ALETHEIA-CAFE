/**
 * [File Path] src/db/queries/transformers.ts
 */
import { isTruthy } from './utils';

const MAX_TAG_DISPLAY = 4;  // 営業時間＋タグ3つ

// 特徴的な項目
export const UNIQUE_FEATURES = [
  { key: 'baby', label: 'ベビーカーOK' },
  { key: 'buffet', label: 'ドーナツ食べ放題' },
  { key: 'pop_buffet', label: 'ドーナツポップ詰め放題' },
] as const;

// 普遍的な項目
export const INFRA_FEATURES = [
  { key: 'free_refill', label: 'ドリンクおかわり無料' },
  { key: 'takeout', label: 'テイクアウト' },
  { key: 'parking', label: '駐車場' },
  { key: 'outlets', label: '電源' },
  { key: 'wifi', label: 'Wi-Fi' },
] as const;

// 喫煙ステータス
export const SMOKING_LABELS = {
  NO_SMOKING: '禁煙',
  SMOKING_ROOM: 'タバコ可',
  SMOKING_SEATS: 'タバコ可',
  ALL_SMOKING: 'タバコ可',
} as const;

export const PAYMENT_LABELS = {
  CASH_ONLY: '現金のみ',
  CASHLESS: 'クレカ/電子マネー',
  PAYPAY: 'PayPay',
} as const;

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

    // --- 3. 喫煙ステータス ---
    if (tags.length < MAX_TAG_DISPLAY && attrs.smoking) {
      const s = attrs.smoking;
      if (s === 'SMOKING_ROOM' || s === 'SMOKING_SEATS') {
        tags.push(SMOKING_LABELS.SMOKING_ROOM);
      } else if (s === 'ALL_SMOKING') {
        tags.push(SMOKING_LABELS.ALL_SMOKING);
      }
    }

    // --- 4. 決済方法（優先順位のロジックを変更） ---
    if (tags.length < MAX_TAG_DISPLAY) {
      const p = attrs.payment;
      if (Array.isArray(p) && p.length > 0) {
        if (p.includes('CASH_ONLY')) {
          tags.push(PAYMENT_LABELS.CASH_ONLY);
        } else if (p.includes('CREDIT') || p.includes('E_MONEY')) {
          // 👈 クレカ、または電子マネーが1つでも入っていれば最優先で「クレカ/電子マネー」
          tags.push(PAYMENT_LABELS.CASHLESS);
        } else if (p.includes('PayPay') || p.includes('QR')) {
          // 👈 クレカ・電子マネーがなく、PayPay（またはQR）のみの場合だけ「PayPay」
          tags.push(PAYMENT_LABELS.PAYPAY);
        } else {
          // 安全弁（それ以外の想定外のキャッシュレス手段がある場合）
          tags.push(PAYMENT_LABELS.CASHLESS);
        }
      }
    }

    // --- 5. 普遍的な項目 (駐車場、電源、Wi-Fi) ---
    for (const item of INFRA_FEATURES) {
      if (tags.length < MAX_TAG_DISPLAY && isTruthy(attrs[item.key])) {
        tags.push(item.label);
      }
    }

    return tags.slice(0, MAX_TAG_DISPLAY);
  } catch {
    return [];
  }
};