/**
 * [File Path] src/db/queries/transformers.ts
 * [Role] データベースの生データを表示形式へ変換するロジック
 */
import { isTruthy } from './utils';

// --- 設定・固定値 ---
const MAX_TAG_DISPLAY = 3; // UIに表示するラベルの最大数

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
 * 属性JSONを表示用ラベルの配列に変換
 * 設定された最大数に基づき、支払い方法を優先してラベルを抽出します。
 */
export const formatAttributes = (jsonStr: string): string[] => {
  try {
    const attrs: ServiceAttributes = JSON.parse(jsonStr || '{}');
    const tags: string[] = [];

    // 1. 支払い方法の判定（優先表示）
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

    // 2. 設備フラグの判定（LABEL_MAPに基づき抽出）
    const otherTags = Object.entries(attrs)
      .filter(([k, v]) => LABEL_MAP[k] && isTruthy(v))
      .map(([k]) => LABEL_MAP[k]);

    // UIの美観のため、定数で定義した最大数に制限
    return [...tags, ...otherTags].slice(0, MAX_TAG_DISPLAY);
  } catch {
    return []; // 解析失敗時は安全に空配列を返す
  }
};