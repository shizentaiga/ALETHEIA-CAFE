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

  // 1. 配列への正規化
  const rawArray = Array.isArray(queries) ? queries : [queries];

  // 2. 文字列の分解とクリーニング
  const allWords = rawArray
    .flatMap((v) => v.split(/[\s　]+/)) // 空白分割
    .map((v) => v.trim())             // 前後空白削除
    .filter(Boolean);                 // 空文字排除

  // 3. 重複排除と件数制限 (最大5件)
  return [...new Set(allWords)].slice(0, 5);
};

/**
 * 現在のURLパラメータを継承しながら、指定した項目だけをピンポイントで更新したURLを生成する
 * 
 * 【目的】
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
    // 値が null の場合：その条件を検索から除外する
    if (value === null) {
      params.delete(key);
      return;
    }

    // 値が配列の場合：既存の同名キーを一度リセットし、新しい値のリストで上書きする
    // (例: 複数のキーワードチップを扱う際などに使用)
    if (Array.isArray(value)) {
      params.delete(key);
      value.forEach(v => params.append(key, v));
      return;
    }

    // 値が文字列等の場合：既存の値を新しい値で上書き、または新規追加
    params.set(key, value);
  });

  // 3. 最終的なURL文字列を組み立て
  const query = params.toString();
  
  // クエリがあれば「/?q=...」を返し、なければトップ「/」を返す
  return query ? `/?${query}` : '/';
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

/**
 * area_id の形式から現在のエリアレベルを判定する
 * 0: "00" (全国)
 * 1: "10" (地方)
 * 2: "10-13" (都道府県)
 * 3: "10-13-A001" (市区町村)
 */
export const getAreaLevel = (areaId: string | null | undefined): number => {
  if (!areaId) return 0;
  const hyphenCount = (areaId.match(/-/g) || []).length;
  return hyphenCount + 1;
};

/**
 * 検索用の LIKE パターンを生成する
 * 
 * @param areaId - 選択されたエリアID
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