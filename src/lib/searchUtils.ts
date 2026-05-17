/**
 * [File Path] src/lib/searchUtils.ts
 * [Role] Logic for search query normalization and URL state synchronization.
 */

import { UNIQUE_FEATURES, INFRA_FEATURES } from '../db/queries/transformers';

/**
 * 設定定数
 */
const MAX_KEYWORDS_LIMIT = 20;

// 💡 許可された特徴検索キーの型を UNIQUE_FEATURES と INFRA_FEATURES から自動抽出
const VALID_FEATURE_KEYS = [
  ...UNIQUE_FEATURES.map(f => f.key),
  ...INFRA_FEATURES.map(f => f.key)
] as const;

export type ValidAttributeKey = typeof VALID_FEATURE_KEYS[number];

/**
 * URLクエリパラメータから有効な特徴(attrs)配列を正規化して抽出する（型安全）
 * - 不正な文字列や未知のキーは自動的に除外（検索対象外）される
 */
export const getNormalizedAttributes = (queries: string | string[] | undefined): ValidAttributeKey[] => {
  if (!queries) return [];

  const rawArray = Array.isArray(queries) ? queries : [queries];

  // 💡 カンマ区切りの文字列を確実に分解し、フラットな配列にする
  const splittedArray = rawArray.flatMap(v => v ? v.split(',') : []);

  // 許可リストに存在するキーのみをフィルタリングして重複排除
  const validAttrs = splittedArray
    .map(v => v?.trim())
    .filter((v): v is ValidAttributeKey => VALID_FEATURE_KEYS.includes(v as ValidAttributeKey));

  return [...new Set(validAttrs)];
};

/**
 * URLクエリパラメータ(q)からキーワード配列を正規化して抽出する
 * - 配列/文字列の両方に対応
 * - 最大件数制限（MAX_KEYWORDS_LIMIT）を適用
 */
export const getNormalizedKeywords = (queries: string | string[] | undefined): string[] => {
  if (!queries) return [];

  // 1. 配列への正規化
  const rawArray = Array.isArray(queries) ? queries : [queries];

  // 2. 文字列の分解とクリーニング
  const allWords = rawArray
    // 💡 空白（半角・全角）だけでなく、URLのカンマ（,）区切りにも対応させる
    .flatMap((v) => v ? v.split(/[\s　,]+/) : [])
    .map((v) => v.trim())              // 前後空白削除
    .filter(Boolean);                  // 空文字排除

  // 3. 重複排除と件数制限
  return [...new Set(allWords)].slice(0, MAX_KEYWORDS_LIMIT);
};

/**
 * 現在のURLパラメータを継承しながら、指定した項目だけをピンポイントで更新したURLを生成する
 * * 【目的】
 * 検索キーワード(q)を更新する際、同時に設定されている「エリア(area)」や「ソート順」などの
 * 他の条件を消さずに、URLの状態を同期し続けるために使用します。
 */
export const createSearchUrl = (
  currentParams: URLSearchParams,
  updates: Record<string, string | string[] | null>
): string => {
  // 1. 現在の全パラメータをコピー（元の検索状態をベースにする）
  const params = new URLSearchParams(currentParams.toString());

  // 2. 更新したい項目だけをループして適用
  Object.entries(updates).forEach(([key, value]) => {
    // 値が null、または空の配列の場合：その条件を検索から除外する
    if (value === null || (Array.isArray(value) && value.length === 0)) {
      params.delete(key);
      return;
    }

    // 値が配列の場合：カンマ区切りの文字列に対応(複数キーワード指定など)
    if (Array.isArray(value)) {
      params.delete(key);
      
      // 特徴(attrs)とキーワード(q)は、カンマ区切りで複数指定可能
      if (key === 'attrs' || key === 'q') {
        // [x1, x2] を "x1,x2" に結合して一意のキーとしてセット
        params.set(key, value.join(','));
      } else {
        // 既存の他の配列パラメータ（もしあれば）の挙動は壊さない
        value.forEach(v => params.append(key, v));
      }
      return;
    }

    // 値が文字列等の場合：既存の値を新しい値で上書き、または新規追加
    params.set(key, value);
  });

  // 3. 最終的なURL文字列を組み立て
  const query = params.toString();
  
  // クエリがあれば「?q=...」を返し、なければ空文字列を返す
  // （これにより呼び出し側がベースパスを自由に結合できるようになります）
  return query ? `?${query}` : '';
};

/**
 * 配列をスペース区切りの文字列へ変換 (DBクエリや表示用)
 */
export const joinKeywords = (keywords: string[]): string => {
  return keywords.join(' ');
};

/**
 * 住所の表記揺れを吸収するための正規化関数
 * 突合（比較）用に使用し、表示用データは書き換えない
 */
export const normalizeAddress = (address: string): string => {
  if (!address) return '';

  return address
    .replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0)) // 全角英数→半角
    .replace(/\s+/g, '')                                                   // 空白削除
    .replace(/[ー－―‐－]/g, '-')                                           // ハイフン類の統一
    .replace(/ヶ/g, 'ケ')                                                   // ヶ/ケの統一
    .replace(/塩釜/g, '塩竈');                                              // 特定の表記揺れを吸収
};

/**
 * area_id の形式から現在のエリアレベルを判定する
 * 0: "00" (全国)
 * 1: "10" (地方)
 * 2: "10-13" (都道府県)
 * 3: "10-13-A001" (市区町村)
 */
export const getAreaLevel = (areaId: string | null | undefined): number => {
  // 💡 areaId が null, undefined, または "00" の場合はレベル 0 (全国) とみなす
  if (!areaId || areaId === '00') return 0;
  
  // 文字列の分割数をベースにすることで、より厳密に階層を判定
  const segments = areaId.split('-');
  return segments.length;
};

/**
 * 検索用の LIKE パターンを生成する
 * * @param areaId - 選択されたエリアID
 * @returns SQL の LIKE 句に渡す文字列、または全国検索用の空文字
 */
export const generateAreaLikePattern = (areaId: string | null | undefined): string => {
  const level = getAreaLevel(areaId);

  // 1. 全国 (Level 0) の場合
  // 全件ヒットさせるために '%' を返す（SQL側で LIKE '%' となる）
  if (level === 0) return '%';

  // 2. 市区町村 (Level 3) の場合
  // 完全一致を期待するため、ワイルドカードを付けずにそのまま返す
  if (level === 3) return areaId as string;

  // 3. 地方・都道府県 (Level 1, 2) の場合
  // そのエリア配下をすべて含めるため末尾に '-%' を付与
  return `${areaId}-%`;
};

/**
 * UI表示用のラベル生成ヘルパー
 * 「東京都」→「東京都すべて」のような変換に使用
 */
export const getAreaAllLabel = (name: string, level: number): string => {
  if (level === 0) return "全国";
  return `${name} すべて`;
};

/**
 * 住所のクリーニング（最小限）
 */
export function cleanDisplayAddress(str: string) {
    if (!str) return '';
    // NFKC正規化で全角数字・全角スペース・全角ハイフンを一括で半角に変換
    // その後、タブや改行を除去
    return str.normalize('NFKC')
              // VSCodeが警告を出す特定のハイフン（U+2010等）を半角マイナスに変換
              // .replace(/[‐－ー—]/g, '-') // ジェイアールがジェイア-ルに誤変換されるためコメントアウト
              .replace(/\t/g, ' ')
              .replace(/\r?\n/g, ' ')
              .trim();
}