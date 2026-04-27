import { Hono } from 'hono'
import { html } from 'hono/html'

export const test04 = new Hono()

// --- 1. サーバーサイド・データ（D1等を想定） ---
const GET_DATA = (parentId: string | null) => {
  if (!parentId) return [
    { label: "関東", value: "kantou", hasSub: true },
    { label: "関西", value: "kansai", hasSub: true }
  ]
  if (parentId === "kantou") return [
    { label: "東京都", value: "tokyo", hasSub: true },
    { label: "神奈川県", value: "kanagawa", hasSub: true }
  ]
  if (parentId === "tokyo") return [
    { label: "新宿区", value: "shinjuku", hasSub: false },
    { label: "渋谷区", value: "shibuya", hasSub: false },
    { label: "杉並区", value: "suginami", hasSub: false }
  ]
  return []
}

test04.get('/', (c) => {
  // デザイン（CSS）はプロトタイプのものをそのまま流用し、
  // ロジックを Hono の jsx/html テンプレートに移植します。
  return c.render(
    <>
      <style>{`
        /* プロトタイプのスタイルをここに集約（一部抜粋） */
        .phone-frame { width: 375px; height: 667px; background: white; position: relative; overflow: hidden; border-radius: 32px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); margin: auto; }
        #drilldown-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: white; z-index: 100; transform: translateX(100%); transition: transform 0.25s cubic-bezier(0.33, 1, 0.68, 1); display: flex; flex-direction: column; }
        #drilldown-overlay.open { transform: translateX(0); }
        .layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: white; transition: transform 0.25s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.2s ease; display: flex; flex-direction: column; }
        .layer.hidden-left { transform: translateX(-20%); opacity: 0.7; }
        .layer.off-right { transform: translateX(100%); }
        .nav-header { height: 54px; display: flex; align-items: center; border-bottom: 0.5px solid #e5e5ea; }
        .list-item { padding: 14px 16px; border-bottom: 0.5px solid #e5e5ea; cursor: pointer; display: flex; justify-content: space-between; }
        .back-link { color: #007AFF; cursor: pointer; padding: 8px; display: flex; align-items: center; }
        .back-link::before { content: ""; width: 8px; height: 8px; border-left: 2px solid #007AFF; border-bottom: 2px solid #007AFF; transform: rotate(45deg); margin-right: 4px; }
      `}</style>

      <div class="phone-frame">
        <div style="padding: 20px; text-align: center; display: flex; flex-direction: column; justify-content: center; height: 100%;">
          <h2 style="font-weight: 800;">ALETHEIA</h2>
          <button class="trigger-btn" style="padding: 16px; background: #007AFF; color: white; border: none; border-radius: 14px; font-weight: 600;" onclick="openDrilldown()">エリアから探す</button>
          <p id="result-display" style="margin-top: 24px; font-weight: 600; color: #007AFF;"></p>
        </div>

        {/* ドリルダウン本体 */}
        <div id="drilldown-overlay"></div>
      </div>

      {/* クライアントサイド・スクリプト 
          Honoからデータを注入しつつ、アニメーションはJSで制御する「ハイブリッド型」
      */}
      {html`
        <script>
          let stack = [];

          async function openDrilldown() {
            document.getElementById('drilldown-overlay').classList.add('open');
            // 最初の階層をロード
            await loadLayer(null, "エリア", null);
          }

          async function loadLayer(parentId, title, parentLabel) {
            // ここでHonoのAPIを叩いてデータを取得するように拡張可能
            // 今回はシミュレーション用に、関数から取得
            const response = await fetch(\`./test04/api/data?parentId=\${parentId || ''}\`);
            const items = await response.json();
            renderLayer(items, title, parentLabel);
          }

          function renderLayer(items, title, parentLabel) {
            const container = document.getElementById('drilldown-overlay');
            const currentLayers = container.querySelectorAll('.layer');
            currentLayers.forEach(l => l.classList.add('hidden-left'));

            const layer = document.createElement('div');
            layer.className = 'layer off-right';
            
            const breadcrumb = stack.map(s => s.title).join(' / ');

            layer.innerHTML = \`
              <div class="nav-header">
                <div class="nav-left">
                  \${parentLabel ? \`<span class="back-link" onclick="goBack()">\${parentLabel}</span>\` : ''}
                </div>
                <div class="nav-center" style="flex:1; text-align:center;">
                  \${breadcrumb ? \`<div style="font-size:10px; color:#8e8e93;">\${breadcrumb}</div>\` : ''}
                  <div style="font-weight:600;">\${title}</div>
                </div>
                <div class="nav-right" style="min-width:60px;">
                  \${!parentLabel ? \`<span style="color:#007AFF; padding:8px;" onclick="closeDrilldown()">閉じる</span>\` : ''}
                </div>
              </div>
              <div style="flex:1; overflow-y:auto;">
                \${parentLabel ? \`
                  <div class="list-item" onclick="finalize('\${title}（全域）')">
                    <span style="color:#007AFF; font-weight:600;">\${title}（全域）</span>
                  </div>
                \` : ''}
                \${items.map(item => \`
                  <div class="list-item" onclick="handleSelect('\${item.value}', '\${item.label}', \${item.hasSub}, '\${title}')">
                    <span>\${item.label}</span>
                    \${item.hasSub ? '<span style="color:#c7c7cc;">▶</span>' : ''}
                  </div>
                \`).join('')}
              </div>
            \`;
            
            container.appendChild(layer);
            setTimeout(() => layer.classList.remove('off-right'), 10);
            stack.push({ title, element: layer });
          }

          function handleSelect(value, label, hasSub, currentTitle) {
            if (hasSub) {
              loadLayer(value, label, currentTitle);
            } else {
              finalize(label);
            }
          }

          function goBack() {
            const current = stack.pop();
            current.element.classList.add('off-right');
            const previous = stack[stack.length - 1];
            previous.element.classList.remove('hidden-left');
            setTimeout(() => current.element.remove(), 250);
          }

          function finalize(value) {
            document.getElementById('result-display').innerText = "📍 " + value;
            document.getElementById('drilldown-overlay').classList.remove('open');
            setTimeout(() => {
               document.getElementById('drilldown-overlay').innerHTML = '';
               stack = [];
            }, 300);
          }

          function closeDrilldown() {
            document.getElementById('drilldown-overlay').classList.remove('open');
          }
        </script>
      `}
    </>
  )
})

// --- 4. データ提供用 API エンドポイント ---
test04.get('/api/data', (c) => {
  const parentId = c.req.query('parentId') || null
  const data = GET_DATA(parentId)
  return c.json(data)
})