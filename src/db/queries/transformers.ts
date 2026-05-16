/**
 * [File Path] src/db/queries/transformers.ts
 */
import { isTruthy } from './utils';

const MAX_TAG_DISPLAY = 4;  // 営業時間＋タグ3つ

// 「特徴的な項目」を定義。バリューの高い順に並べるのがコツ。
const UNIQUE_FEATURES = [
  { key: 'baby', label: '赤ちゃんOK' },
  { key: 'buffet', label: '食べ放題' },
  { key: 'pop_buffet', label: '詰め放題' },
  { key: 'free_refill', label: 'おかわり自由' },
] as const;

// 「普遍的な項目（インフラ系）」を定義。UNIQUE_FEATURESより後に評価。
const INFRA_FEATURES = [
  { key: 'parking', label: '駐車場あり' },
  { key: 'outlets', label: '電源あり' },
  { key: 'wifi', label: 'Wi-Fi' },
] as const;

const PAYMENT_LABELS = {
  CASH_ONLY: '現金のみ',
  CASHLESS: 'クレカ/電子マネー', // 👈 採用
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
      if (attrs.smoking === 'SMOKING_ROOM' || attrs.smoking === 'SMOKING_SEATS') {
        tags.push('喫煙室あり');
      } else if (attrs.smoking === 'ALL_SMOKING') {
        tags.push('全席喫煙可');
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