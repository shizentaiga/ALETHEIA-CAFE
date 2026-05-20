/**
 * [ファイルパス] src/components/SearchResult.tsx
 */

import type { FC } from 'hono/jsx'
import { formatAttributes } from '../db/queries/main' // 特徴表示用(チップ形式)

// --- 型定義 ---
export interface ServiceResult {
  service_id: string;
  title: string;
  address: string;
  attributes_json: string;
  nearestStation?: { stationName: string } | null;
  access?: { text: string; distanceText: string } | null;
}

export interface SearchResultProps {
  results: ServiceResult[];
  total: number;
  area?: string;
  q?: string; // サーバー側で正規化されたクエリ文字列
  page?: number; // 💡 ページネーション用パラメータ
}

// --- スタイル定義 ---
/**
 * 検索結果モジュール専用のスコープスタイル
 * 他のコンポーネントへのCSS漏洩を防ぐためにスコープIDを使用
 */
const moduleStyle = (scope: string) => `
  #${scope} { margin-top: 10px; }
  
  /* result-header を静かに */
  #${scope} .result-header { 
    font-size: 0.75rem; 
    color: #64748b;        /* 👈 柔らかいニュアンスグレーへ */
    font-weight: 600;      /* 👈 ほんの少しだけ太く */
    margin-bottom: 12px;   /* 👈 下のカードとの余白を少し拡張 */
    padding-left: 2px;     /* 👈 左側のカードの端と縦のラインを揃える */
    letter-spacing: 0.04em;
  }

  /* スマホのカラム設定(1カラム or 2カラム) */
  #search-results-target { 
    display: grid; 
    /* grid-template-columns: repeat(2, 1fr); */ /* 2カラム */
    grid-template-columns: 1fr; /* 1カラム */
    gap: 12px; /* 1カラム：12px(広め)、2カラム：8px(狭め) */
  }

  /* PCは1カラム維持 */
  @media (min-width: 640px) {
    #search-results-target { grid-template-columns: 1fr; }
  }

  /* カード角丸と hoverの調整 */
  #${scope} .cafe-card {
    display: block; 
    text-decoration: none; 
    color: inherit;
    padding: 12px;              /* 👈 10pxから12pxへ。内側の余白にゆとりを持たせる */
    border: 1px solid #f1f5f9; 
    border-radius: 14px; /* 角丸を少し増やす */
    background: #fff; 
    transition: all 0.15s ease; /* 👈 border-color から all に変更 */
  }

  #${scope} .cafe-card:hover { 
    border-color: #d7dee7;       /* hover 時に border を少しだけ明るく */
    background: #fafbfc;         /* 👈 マウスが乗ったことが直感的にわかる極薄グレーを追加 */
  }

  /* タイトル行数制限 */
  #${scope} .name { 
    font-weight: 700; 
    color: #111;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.35;
    font-size: 0.9rem;
  }

  /* 住所（駅情報）をさらに弱く */
  #${scope} .addr { 
    font-size: 0.72rem; 
    color: #64748b; /* 視認性を確保しつつ主張を抑える */
    line-height: 1.45; 
    display: block;
    margin-top: 4px; 
    white-space: nowrap;     /* 改行禁止 */
    overflow: hidden;        /* はみ出しを隠す */
    text-overflow: ellipsis; /* 三点リーダを表示 */
  }

  /* タグを“静か”にする */
  .tag-box { display: flex; gap: 4px; margin-top: 8px; flex-wrap: wrap; }
  .tag { 
    font-size: 0.65rem; 
    background: #f1f5f9; 
    padding: 3px 10px;         /* 👈 2px 8px から 3px 10px に広げて文字の窮屈さを解消 */
    border-radius: 999px; /* 完全に丸く */
    color: #55667a; /* タグも一段階濃くして確実にパスさせる */
    font-weight: 400; 
    border: 1px solid #e8edf3; /* 👈 #e2e8f0 から、少しだけ背景に馴染む優しい色合いへ */
    line-height: 1.2; /* タグの縦位置だけ少し整える */
  }
`

const LABELS = {
  resultPrefix: "検索結果:"
}

/**
 * 検索結果コンポーネント
 * 結果一覧を描画し、クライアント側のJavaScript同期用に隠し状態を埋め込む
 */
export const SearchResult: FC<SearchResultProps> = ({ results, total, area = '', q = '', page = 1 }) => {
  const scope = "search-result-module"

  return (
    <section id={scope}>
      <style>{moduleStyle(scope)}</style>
      
      <div class="result-header">{LABELS.resultPrefix} {total}件</div>

      <div id="search-results-target">
        {results.map(row => (
          <a class="cafe-card">
            <span class="name">{row.title}</span>

            {/* 最寄駅情報がある場合は優先表示、ない場合は住所を表示 */}
            <span class="addr">
              {row.nearestStation 
                ? `${row.nearestStation.stationName}駅 ${row.access?.text}`
                : row.address
              }
            </span>

            <div class="tag-box">
              {/* 整形された属性を個別のタグバッジにマッピング */}
              {formatAttributes(row.attributes_json).map(tag => (
                <span class="tag">{tag}</span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}