/**
 * [File Path] src/components/SearchResult.tsx
 */
import type { FC } from 'hono/jsx'
import { formatAttributes } from '../db/queries/main'

// --- Types ---
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
  q?: string; // Normalized query string from the server
}

// --- Styles ---
/**
 * Scoped styles for the search result module.
 * Using a scope ID to prevent CSS leakage to other components.
 */
const moduleStyle = (scope: string) => `
  #${scope} { margin-top: 10px; }
  
  /* ⑧ result-header を静かに */
  #${scope} .result-header { 
    font-size: 0.75rem; 
    color: #718096; /* 濃いめのグレーに変更 */
    margin-bottom: 10px; 
    letter-spacing: 0.02em;
  }

  /* スマホ2カラム設定 */
  #search-results-target { 
    display: grid; 
    grid-template-columns: repeat(2, 1fr); 
    gap: 8px; 
  }

  /* ⑥ PCは1カラム維持 */
  @media (min-width: 640px) {
    #search-results-target { grid-template-columns: 1fr; }
  }

  /* ⑨ カード角丸と ② hoverの調整 */
  #${scope} .cafe-card {
    display: block; 
    text-decoration: none; 
    color: inherit;
    padding: 10px; /* ⑦ スマホ時余白減少 */
    border: 1px solid #f1f5f9; 
    border-radius: 14px; /* ⑨ 角丸を少し増やす */
    background: #fff; 
    transition: border-color 0.15s ease; /* ② hoverを弱く */
  }

  #${scope} .cafe-card:hover { 
    border-color: #d1d5db; 
  }

  /* ③ タイトル行数制限 */
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

  /* ④ 住所（駅情報）をさらに弱く */
  #${scope} .addr { 
    font-size: 0.72rem; 
    color: #64748b; /* 視認性を確保しつつ主張を抑える */
    line-height: 1.45; 
    display: block;
    margin-top: 4px; 
  }

  /* ① タグを“静か”にする */
  .tag-box { display: flex; gap: 4px; margin-top: 8px; flex-wrap: wrap; }
  .tag { 
    font-size: 0.65rem; 
    background: #f8fafc; 
    padding: 2px 8px; 
    border-radius: 999px; /* 完全に丸く */
    color: #55667a; /* タグも一段階濃くして確実にパスさせる */
    font-weight: 400; 
    border: 1px solid #f1f5f9;
  }
`

const LABELS = {
  resultPrefix: "検索結果:"
}

/**
 * SearchResult Component
 * Renders the list of results and embeds hidden state for client-side JS synchronization.
 */
export const SearchResult: FC<SearchResultProps> = ({ results, total, area = '', q = '' }) => {
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
              {/* Maps formatted attributes into individual tag badges */}
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