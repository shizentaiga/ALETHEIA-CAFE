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
  perPage: number;            // 親から表示件数を受け取る型
}

export const SearchResultPages: FC<SearchResultPagesProps> = ({
  page,
  total,
  area,
  q,
  currentResultCount,
  perPage
}) => {
  // 総ページ数の計算
  const totalPages = Math.ceil(total / perPage) || 1;

  // 現在のクエリ状態を引き継いだURL文字列を生成する
  const createPageUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    if (area) params.set('area', area);
    if (q) params.set('q', q);
    params.set('page', String(targetPage));
    return `/?${params.toString()}`;
  };

  const hasPrev = page > 1;
  const hasNext = page < totalPages && currentResultCount === perPage;

  // 💡 PC用：動的なページ番号配列を生成するロジック
  const renderDesktopPages = () => {
    const pages: (number | string)[] = [];
    const sidePages = 2; // 現在のページの左右に表示する数

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || // 先頭ページ
        i === totalPages || // 末尾ページ
        (i >= page - sidePages && i <= page + sidePages) // 現在のページの前後
      ) {
        // 直前の要素との間にスキップがある場合は省略符を挿入
        if (pages.length > 0 && typeof pages[pages.length - 1] === 'number' && (i - (pages[pages.length - 1] as number)) > 1) {
          pages.push('…');
        }
        pages.push(i);
      }
    }

    return pages.map((p, idx) => {
      if (p === '…') {
        return <span class="p-ellipsis" key={`ellipsis-${idx}`}>…</span>;
      }
      return (
        <a
          key={`page-${p}`}
          href={createPageUrl(p as number)}
          class={`p-item ${p === page ? 'active' : ''}`}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </a>
      );
    });
  };

  return (
    <nav class="p-nav" aria-label="ページナビゲーション">
      
      {/* 🖥️ PC用レイアウト */}
      <div class="p-desktop">
        <a
          href={hasPrev ? createPageUrl(page - 1) : '#'}
          class={`p-item p-text ${!hasPrev ? 'disabled' : ''}`}
        >
          ‹ 前へ
        </a>

        {renderDesktopPages()}

        <a
          href={hasNext ? createPageUrl(page + 1) : '#'}
          class={`p-item p-text ${!hasNext ? 'disabled' : ''}`}
        >
          次へ ›
        </a>
      </div>

      {/* 📱 スマホ用レイアウト */}
      <div class="p-mobile">
        <a
          href={hasPrev ? createPageUrl(page - 1) : '#'}
          class={`p-item ${!hasPrev ? 'disabled' : ''}`}
          aria-label="前のページへ"
        >
          ‹
        </a>
        
        {/* 💡 修正点: 主張の強かった「{page} / {totalPages}」を廃止し、世界観に合わせた静かな表記へ */}
        <span class="p-mobile-indicator">Page {page}</span>
        
        <a
          href={hasNext ? createPageUrl(page + 1) : '#'}
          class={`p-item ${!hasNext ? 'disabled' : ''}`}
          aria-label="次のページへ"
        >
          ›
        </a>
      </div>

    </nav>
  );
};