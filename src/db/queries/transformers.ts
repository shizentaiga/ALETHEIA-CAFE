/**
 * [File Path] src/db/queries/transformers.ts
 */
import { isTruthy } from './utils';

export interface ServiceAttributes {
  payment?: string[];
  [key: string]: any;
}

export const formatAttributes = (jsonStr: string): string[] => {
  try {
    const attrs: ServiceAttributes = JSON.parse(jsonStr || '{}');
    const labelMap: Record<string, string> = { 
      wifi: 'Wi-Fi', outlets: '電源', baby: 'お子様連れ', smoking: '喫煙', pet: 'ペット可' 
    };

    const tags: string[] = [];
    const payments = attrs.payment;
    if (Array.isArray(payments) && payments.length > 0) {
      const isCashOnly = payments.includes('CASH_ONLY');
      const hasPayPay = payments.includes('PayPay');
      if (isCashOnly) tags.push('現金のみ');
      else if (hasPayPay) tags.push('PayPay可');
      else tags.push('キャッシュレス可');
    }

    const otherTags = Object.entries(attrs)
      .filter(([k, v]) => labelMap[k] && isTruthy(v))
      .map(([k]) => labelMap[k]);

    return [...tags, ...otherTags].slice(0, 3);
  } catch {
    return [];
  }
};