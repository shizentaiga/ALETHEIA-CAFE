// メイン1：エリア検索

import { html } from 'hono/html'
import type { FC } from 'hono/jsx'

/** * 【Design Settings】
 * デザイナー向け：モジュールの見た目はここを編集してください。
 */
const moduleStyle = (scope: string) => `
  #${scope} { font-family: sans-serif; }
  #${scope} .trigger-btn { 
    width: 100%; padding: 12px; cursor: pointer; border: 1px solid #ccc; 
    border-radius: 8px; background: #fff; text-align: left; 
  }
  #${scope} .modal { 
    display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
    background: rgba(0,0,0,0.5); z-index: 1000; 
  }
  #${scope} .modal.is-open { display: flex; justify-content: center; align-items: center; }
  #${scope} .modal-content { 
    background: #fff; padding: 20px; border-radius: 12px; width: 80%; max-width: 300px; 
  }
  #${scope} .item { padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; }
  #${scope} .item:last-child { border-bottom: none; }
`

/**
 * 【Content & Data Settings】
 * 固定文言およびDBから取得予定のデータ定義。
 */
const LABELS = {
  defaultButtonText: "📍 エリアを選択"
}

// DBから取得を想定している値（将来的に props や API 取得に置き換え）
const MOCK_AREAS = [
  { id: 1, name: "東京" },
  { id: 2, name: "神奈川" },
  { id: 3, name: "千葉" }
]

export const SearchArea: FC = () => {
  const scope = "search-area-module"

  return (
    <section id={scope}>
      <style>{moduleStyle(scope)}</style>

      {/* ボタン表示：初期値は LABELS から取得 */}
      <button class="trigger-btn" onclick="toggleAreaModal(true)">
        {LABELS.defaultButtonText}
      </button>

      {/* モーダル：リストは MOCK_AREAS からループ生成 */}
      <div id="area-modal" class="modal" onclick="toggleAreaModal(false)">
        <div class="modal-content" onclick="event.stopPropagation()">
          {MOCK_AREAS.map(area => (
            <div class="item" onclick={`selectArea('${area.name}')`}>
              {area.name}
            </div>
          ))}
        </div>
      </div>

      {html`
        <script>
          function toggleAreaModal(show) {
            const modal = document.getElementById('area-modal');
            modal.classList.toggle('is-open', show);
          }
          function selectArea(name) {
            // ボタンの文言を更新
            const btn = document.querySelector('#${scope} .trigger-btn');
            if (btn) btn.innerText = "📍 " + name;
            
            toggleAreaModal(false);
            console.log(name + " が選択されました");
          }
        </script>
      `}
    </section>
  )
}