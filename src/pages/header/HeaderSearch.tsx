/**
 * [File Path] src/pages/header/HeaderSearch.tsx
 */
import type { FC } from 'hono/jsx'

interface HeaderSearchProps {
  keywords: string[];
  placeholder: string;
  area: string;
}

const CONFIG = {
  target: '#search-result-module',
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
        {/* AND Search: Hidden inputs to keep existing keywords */}
        {keywords.map(word => (
          <input type="hidden" name="q" value={word} />
        ))}

        {/* Chips with HTMX delete functionality */}
        {keywords.map(word => {
          // Calculate URL without 'this' keyword
          const otherWords = keywords.filter(k => k !== word).join(' ');
          const deleteUrl = `/?q=${encodeURIComponent(otherWords)}${area ? `&area=${encodeURIComponent(area)}` : ''}`;

          return (
            <span class="search-chip">
              {word}
              <button 
                type="button"
                class="search-chip-delete"
                hx-get={deleteUrl}
                hx-target={CONFIG.target}
                hx-push-url="true"
                hx-select={CONFIG.target}
              >
                ×
              </button>
            </span>
          );
        })}

        <input 
          id={CONFIG.inputId}
          type="text" 
          name="q" 
          class="header-search-input" 
          placeholder={keywords.length > 0 ? "" : placeholder}
          autocomplete="off"
        />
        
        {area && <input type="hidden" name="area" value={area} />}
        
        <button type="submit" class="header-search-button" aria-label="Search">
          {CONFIG.searchIcon}
        </button>
      </div>
    </form>
  )
}