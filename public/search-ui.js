/**
 * [File Path] public/search-ui.js
 * [Role] Simple UI helper.
 */
window.initSearchUI = () => {
  document.body.addEventListener('htmx:afterSettle', (evt) => {
    // Only reset if our search module was updated
    if (evt.detail.target.id !== 'search-result-module') return;

    const searchInput = document.getElementById('q-input-header');
    if (searchInput) {
      searchInput.value = "";
      searchInput.focus(); // Optional: Keep focus for next input
    }
  });
};

window.initSearchUI();