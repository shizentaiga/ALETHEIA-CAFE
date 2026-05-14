/**
 * [File Path] src/db/queries/transformers.ts
 */
import { isTruthy } from './utils';

const MAX_TAG_DISPLAY = 4;  // 営業時間＋タグ3つ

// 「特徴的な項目」を定義
const UNIQUE_FEATURES = [
  { key: 'buffet', label: '食べ放題' },
  { key: 'baby', label: '赤ちゃんOK' },
] as const;

// 「普遍的な項目（インフラ系）」を定義。UNIQUE_FEATURESより後に評価。
const INFRA_FEATURES = [
  { key: 'outlets', label: '電源あり' },
  { key: 'wifi', label: 'Wi-Fi' },
] as const;

const PAYMENT_LABELS = {
  CASH_ONLY: '現金のみ',
  PAYPAY: 'PayPay可',
  CASHLESS: 'キャッシュレス'
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

    // --- 2. 決済方法 ---
    if (tags.length < MAX_TAG_DISPLAY) {
      const p = attrs.payment;
      if (Array.isArray(p) && p.length > 0) {
        if (p.includes('CASH_ONLY')) tags.push(PAYMENT_LABELS.CASH_ONLY);
        else if (p.includes('PayPay')) tags.push(PAYMENT_LABELS.PAYPAY);
        else tags.push(PAYMENT_LABELS.CASHLESS);
      }
    }


    // --- 3. 特徴的な項目 (食べ放題、赤ちゃんOKなど) ---
    for (const item of UNIQUE_FEATURES) {
      if (tags.length < MAX_TAG_DISPLAY && isTruthy(attrs[item.key])) {
        tags.push(item.label);
      }
    }

    // --- 4. 普遍的な項目 (電源、Wi-Fi) ---
    // 他のタグで埋まっていない場合のみ表示される
    for (const item of INFRA_FEATURES) {
      if (tags.length < MAX_TAG_DISPLAY && isTruthy(attrs[item.key])) {
        tags.push(item.label);
      }
    }

    // 念のため規定数でスライス（ロジック内で制限しているため基本は不要）
    return tags.slice(0, MAX_TAG_DISPLAY);
  } catch {
    return [];
  }
};