/**
 * [File Path] src/pages/header/HeaderSearch.tsx
 * [Role] Handles search input and keyword chip rendering with SSR-based delete functionality.
 */
import type { FC } from 'hono/jsx'

interface HeaderSearchProps {
  keywords: string[];
  placeholder: string;
  area: string;
}

// --- Configuration ---
const CONFIG = {
  target: '#search-result-module',
  deleteIcon: '×',
  searchIcon: '🔍',
  inputId: 'q-input-header'
} as const

export const HeaderSearch: FC<HeaderSearchProps> = ({ keywords, placeholder, area }) => {
  return (
    <form 
      class="header-search-form" 
      hx-get="/" 
      hx-target={CONFIG.target} 
      hx-push-url="true"
      hx-select={CONFIG.target}
    >
      <div class="header-search-input-wrapper">
        {/* Render keywords as chips with SSR delete links */}
        {keywords.map(word => (
        <span class="search-chip">{word}</span>
        ))}

        <input 
          id={CONFIG.inputId}
          type="text" 
          name="q" 
          class="header-search-input" 
          placeholder={keywords.length > 0 ? "" : placeholder}
          autocomplete="off"
        />
        
        {/* Maintain 'area' context during keyword searches */}
        {area && <input type="hidden" name="area" value={area} />}
        
        <button type="submit" class="header-search-button" aria-label="Search">
          {CONFIG.searchIcon}
        </button>
      </div>
    </form>
  )
}