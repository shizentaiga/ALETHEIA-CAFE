/**
 * [File Path] public/search-ui.js
 * [Role] Handles search query tokenization (chips) and UI synchronization.
 */

// --- Configuration ---
const SEARCH_UI_CONFIG = {
  labels: {
    placeholderDefault: "キーワードで検索..",
    deleteIcon: "×"
  },
  selectors: {
    input: 'q-input-header',
    targetModule: 'search-result-module',
    stateQ: '#current-q-state',
    stateArea: '#current-area-state'
  },
  classes: {
    chip: 'search-chip',
    deleteBtn: 'search-chip-delete'
  }
};

window.initSearchUI = () => {
  /**
   * Listen for HTMX 'afterSettle' event.
   * This triggers after the target element has been updated with new content.
   */
  document.body.addEventListener('htmx:afterSettle', (evt) => {
    // Only proceed if the updated element is the search result module
    if (evt.detail.target.id !== SEARCH_UI_CONFIG.selectors.targetModule) return;

    const resModule = evt.detail.target;
    
    /**
     * Retrieve the latest search state from hidden inputs.
     * These values are provided by the server after normalization.
     */
    const q = resModule.querySelector(SEARCH_UI_CONFIG.selectors.stateQ)?.value || "";
    const area = resModule.querySelector(SEARCH_UI_CONFIG.selectors.stateArea)?.value || "";
    
    syncSearchChips(q, area);
  });
};

/**
 * Synchronizes the header search input with the current search query.
 * Transforms space-separated strings into interactive UI chips.
 */
function syncSearchChips(q, area) {
  const searchInput = document.getElementById(SEARCH_UI_CONFIG.selectors.input);
  if (!searchInput) return;

  const wrapper = searchInput.parentElement;
  const currentKeywords = q.split(/[\s　]+/).filter(Boolean);

  // 1. Remove existing chips to prepare for a fresh render
  wrapper.querySelectorAll(`.${SEARCH_UI_CONFIG.classes.chip}`).forEach(chip => chip.remove());

  // 2. Generate new chips dynamically based on the current keywords
  currentKeywords.forEach(word => {
    const span = document.createElement('span');
    span.className = SEARCH_UI_CONFIG.classes.chip;
    span.innerText = word;

    const delBtn = document.createElement('span');
    delBtn.className = SEARCH_UI_CONFIG.classes.deleteBtn;
    delBtn.innerText = SEARCH_UI_CONFIG.labels.deleteIcon;

    /**
     * Construct a new query by excluding the clicked keyword.
     * This allows users to remove specific filters from their search.
     */
    const newQuery = currentKeywords.filter(k => k !== word).join(' ');
    let searchPath = `/?q=${encodeURIComponent(newQuery)}`;
    if (area) searchPath += `&area=${encodeURIComponent(area)}`;

    // Set HTMX attributes for asynchronous partial updates
    delBtn.setAttribute('hx-get', searchPath);
    delBtn.setAttribute('hx-target', `#${SEARCH_UI_CONFIG.selectors.targetModule}`);
    delBtn.setAttribute('hx-push-url', 'true');
    delBtn.setAttribute('hx-select', `#${SEARCH_UI_CONFIG.selectors.targetModule}`);

    span.appendChild(delBtn);
    wrapper.insertBefore(span, searchInput);
  });

  // 3. Reset the input field state
  searchInput.value = "";
  
  /**
   * Toggle placeholder visibility.
   * Hide it if chips are present to keep the UI clean.
   */
  searchInput.placeholder = currentKeywords.length > 0 
    ? "" 
    : SEARCH_UI_CONFIG.labels.placeholderDefault;

  /**
   * 4. Re-initialize HTMX for new elements.
   * HTMX needs to scan the newly added DOM nodes to register the 'hx-' attributes.
   */
  if (window.htmx) {
    htmx.process(wrapper);
  }
}

// Initial call to set up the UI on page load
window.initSearchUI();