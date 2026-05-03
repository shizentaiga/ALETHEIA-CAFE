/**
 * [File Path] src/lib/searchUtils.ts
 * [Role] Logic for search query normalization and URL state synchronization.
 */

/**
 * URLクエリパラメータ(q)からキーワード配列を正規化して抽出する
 * - 配列/文字列の両方に対応
 * - 最大5件制限
 */
export const getNormalizedKeywords = (queries: string | string[] | undefined): string[] => {
  if (!queries) return [];
  const rawArray = Array.isArray(queries) ? queries : [queries];

  const keywords = [
    ...new Set(
      rawArray
        .flatMap((v) => v.split(/[\s　]+/))
        .map((v) => v.trim())
        .filter(Boolean)
    ),
  ];

  return keywords.slice(0, 5); // DB負荷保護のため5件上限
};

/**
 * キーワード配列から安全にエンコードされた検索URLを生成する
 */
export const createSearchUrl = (keywords: string[], baseUrl: string = ''): string => {
  const params = new URLSearchParams();
  keywords.forEach((kw) => params.append('q', kw));
  
  const queryString = params.toString();
  // クエリが空なら baseUrl または現在のディレクトリを返す
  return queryString ? `${baseUrl}?${queryString}` : baseUrl || './';
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
};