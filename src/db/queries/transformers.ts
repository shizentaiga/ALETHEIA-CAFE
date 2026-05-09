/**
 * [File Path] src/db/queries/transformers.ts
 */
import { isTruthy } from './utils';

const MAX_TAG_DISPLAY = 5;  // 表示するタグ数

// 優先順位に基づいたラベル定義（上に書いたものほど優先される）
const FEATURE_PRIORITY = [
  { key: 'buffet', label: '食べ放題' },
  { key: 'baby', label: '赤ちゃんOK' },
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

    // 1. 体験・インフラ系（優先度順に走査）
    for (const item of FEATURE_PRIORITY) {
      if (isTruthy(attrs[item.key])) {
        tags.push(item.label);
      }
    }

    // 2. 営業時間（12文字以内なら採用。例: "9:00-21:00"）
    if (attrs.business_hours && typeof attrs.business_hours === 'string') {
      const hours = attrs.business_hours;
      if (hours.length > 0 && hours.length <= 12) {
        tags.push(hours);
      }
    }

    // 3. 決済方法（優先度が低いため、枠が余っている場合のみ評価）
    if (tags.length < MAX_TAG_DISPLAY) {
      const p = attrs.payment;
      if (Array.isArray(p) && p.length > 0) {
        if (p.includes('CASH_ONLY')) tags.push(PAYMENT_LABELS.CASH_ONLY);
        else if (p.includes('PayPay')) tags.push(PAYMENT_LABELS.PAYPAY);
        else tags.push(PAYMENT_LABELS.CASHLESS);
      }
    }

    // 規定数でスライス
    return tags.slice(0, MAX_TAG_DISPLAY);
  } catch {
    return [];
  }
};