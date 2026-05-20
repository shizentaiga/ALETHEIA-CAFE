/**
 * [ファイルパス] src/components/SearchResultPages.tsx
 */

import type { FC } from 'hono/jsx'

interface SearchResultPagesProps {
  page: number;
  total: number;
  area: string;
  q: string;
  currentResultCount: number; // 次のページがあるかの判定用に現在の取得件数を受け取る
  perPage: number;            // 💡 1. 修正点: 親から表示件数を受け取る型を追加
}

export const SearchResultPages: FC<SearchResultPagesProps> = ({
  page,
  total,
  area,
  q,
  currentResultCount,
  perPage                     // 💡 2. 修正点: プロップスから受け取る
}) => {
  // 現在のクエリ状態を引き継いだURL文字列を生成する
  const createPageUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    if (area) params.set('area', area);
    if (q) params.set('q', q);
    params.set('page', String(targetPage));
    return `/?${params.toString()}`;
  };

  // 💡 3. 修正点: 「const perPage = 20;」のローカル固定値を削除しました
  const hasPrev = page > 1;
  const hasNext = currentResultCount === perPage; // 取得件数が上限一杯なら「次」があると判定（受け取った perPage と同期）

  return (
    <nav class="p-nav" aria-label="ページナビゲーション">
      <a 
        href={hasPrev ? createPageUrl(page - 1) : '#'} 
        class={`p-item ${!hasPrev ? 'disabled' : ''}`}
      >
        ‹ 戻る
      </a>
      
      <span class="p-indicator">{page}</span>
      
      <a 
        href={hasNext ? createPageUrl(page + 1) : '#'} 
        class={`p-item ${!hasNext ? 'disabled' : ''}`}
      >
        次へ ›
      </a>
    </nav>
  );
};