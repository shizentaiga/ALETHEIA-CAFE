/**
 * [File Path] src/lib/search.ts
 * [Role] Logic for search query normalization and URL state synchronization.
 */
import { Context } from 'hono'

/**
 * ==========================================
 * 1. 既存コード (互換性維持のため残す)
 * ==========================================
 */

/**
 * @deprecated 新しい実装では getNormalizedKeywords を使用してください
 */
export const normalizeQuery = (q: string): string => {
  const rawKeywords = q.trim().split(/[\s　]+/).filter(Boolean);
  return [...new Set(rawKeywords)].join(' ');
};

/**
 * @deprecated 新しい実装では createSearchUrl と HTMX の属性ベースの遷移を使用してください
 */
export const syncUrlWithQuery = (c: Context, rawQ: string, cleanQ: string) => {
  const isHtmx = c.req.header('HX-Request');
  
  if (isHtmx && rawQ !== cleanQ) {
    const url = new URL(c.req.url);
    if (cleanQ) {
      url.searchParams.set('q', cleanQ);
    } else {
      url.searchParams.delete('q');
    }
    c.header('HX-Push-Url', url.pathname + url.search);
  }
};

/**
 * ==========================================
 * 2. 新規コード (計画書 v1.1 に基づく新ロジック)
 * ==========================================
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