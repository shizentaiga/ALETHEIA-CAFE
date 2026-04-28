/**
 * [File Path] src/db/queries/transformers.ts
 * [Role] DBの生データをUI表示用のクリーンなオブジェクトに変換する
 */

import { isTruthy } from './utils';

export interface ServiceAttributes {
  payment?: string[];
  [key: string]: any;
}

/**
 * 属性JSONを表示用ラベル（最大3つ）に変換
 * 支払い方法を優先し、その後Wi-Fiや電源などの設備状況を付加します。
 */
export const formatAttributes = (jsonStr: string): string[] => {
  try {
    const attrs: ServiceAttributes = JSON.parse(jsonStr || '{}');
    const labelMap: Record<string, string> = { 
      wifi: 'Wi-Fi', outlets: '電源', baby: 'お子様連れ', smoking: '喫煙', pet: 'ペット可' 
    };

    const tags: string[] = [];
    
    // 1. 支払い方法の判定（優先表示）
    const payments = attrs.payment;
    if (Array.isArray(payments) && payments.length > 0) {
      if (payments.includes('CASH_ONLY')) tags.push('現金のみ');
      else if (payments.includes('PayPay')) tags.push('PayPay可');
      else tags.push('キャッシュレス可');
    }

    // 2. 設備フラグの判定
    const otherTags = Object.entries(attrs)
      .filter(([k, v]) => labelMap[k] && isTruthy(v))
      .map(([k]) => labelMap[k]);

    // UIの美観のため最大3つに制限
    return [...tags, ...otherTags].slice(0, 3);
  } catch {
    return []; // 解析失敗時は空配列で安全に返す
  }
};

/**
 * DBレコードの一括整形
 * 検索結果などの各レコードを、コンポーネントがそのまま使える形式に整えます。
 */
export const transformService = (record: any) => ({
  id: record.service_id,
  title: record.title,
  address: record.address,
  tags: formatAttributes(record.attributes_json)
});