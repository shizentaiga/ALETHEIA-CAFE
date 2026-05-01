/**
 * [File Path] src/db/queries/transformers.ts
 * [Role] Logic to transform raw database data into display formats.
 */
import { isTruthy } from './utils';

// --- CONFIGURATION ---
const MAX_TAG_DISPLAY = 3; // Maximum number of labels to show in the UI

const LABEL_MAP: Record<string, string> = {
  wifi: 'Wi-Fi',
  outlets: '電源',
  baby: 'お子様連れ',
  smoking: '喫煙',
  pet: 'ペット可'
};

const PAYMENT_LABELS = {
  CASH_ONLY: '現金のみ',
  PAYPAY: 'PayPay可',
  CASHLESS: 'キャッシュレス可'
} as const;
// -------------------

export interface ServiceAttributes {
  payment?: string[];
  [key: string]: any;
}

/**
 * Converts attribute JSON into an array of display labels.
 * Prioritizes payment methods and extracts labels based on the display limit.
 */
export const formatAttributes = (jsonStr: string): string[] => {
  try {
    const attrs: ServiceAttributes = JSON.parse(jsonStr || '{}');
    const tags: string[] = [];

    // 1. Evaluate payment methods (Priority display)
    const payments = attrs.payment;
    if (Array.isArray(payments) && payments.length > 0) {
      if (payments.includes('CASH_ONLY')) {
        tags.push(PAYMENT_LABELS.CASH_ONLY);
      } else if (payments.includes('PayPay')) {
        tags.push(PAYMENT_LABELS.PAYPAY);
      } else {
        tags.push(PAYMENT_LABELS.CASHLESS);
      }
    }

    // 2. Evaluate equipment flags (Extracted via LABEL_MAP)
    const otherTags = Object.entries(attrs)
      .filter(([k, v]) => LABEL_MAP[k] && isTruthy(v))
      .map(([k]) => LABEL_MAP[k]);

    // Limit to constant for UI consistency
    return [...tags, ...otherTags].slice(0, MAX_TAG_DISPLAY);
  } catch {
    return []; // Safely return an empty array if parsing fails
  }
};