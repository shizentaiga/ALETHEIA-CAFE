/**
 * [File Path] src/pages/header/HeaderSearch.tsx
 * [Role] Handles search input and keyword chip rendering.
 */
import type { FC } from 'hono/jsx'

interface HeaderSearchProps {
  keywords: string[];
  placeholder: string;
  area: string;
}

export const HeaderSearch: FC<HeaderSearchProps> = ({ keywords, placeholder, area }) => {
  return (
    <form 
      class="header-search-form" 
      hx-get="/" 
      hx-target="#search-result-module" 
      hx-push-url="true"
      hx-select="#search-result-module"
    >
      <div class="header-search-input-wrapper">
        {/* Render keywords as chips if present */}
        {keywords.map(word => (
          <span class="search-chip">{word}</span>
        ))}

        <input 
          id="q-input-header"
          type="text" 
          name="q" 
          class="header-search-input" 
          placeholder={keywords.length > 0 ? "" : placeholder}
        />
        {/* Maintain 'area' context during keyword searches */}
        {area && <input type="hidden" name="area" value={area} />}
        
        <button type="submit" class="header-search-button" aria-label="Search">
          🔍
        </button>
      </div>
    </form>
  )
}