import { Hono } from 'hono'
import { html } from 'hono/html'

export const test06 = new Hono()

// --- 1. 本番と同じデザイン設定 ---
const DESIGN = {
  width: '100%',
  borderRadius: '12px',
  colors: {
    border: '#e5e7eb',
    text: '#64748b',
    textSecondary: '#94a3b8',
    background: '#fff',
    hoverBg: '#f9fafb',
    headerBg: '#f9fafb',
    accent: '#0070f3'
  }
} as const

// --- 2. 擬似データ (本番DBの構造を模したもの) ---
// 本番では dbQueries.getSubAreas から取得する内容
const MOCK_DB = [
  { area_id: '10', name: '関東', area_level: 1 },
  { area_id: '20', name: '関西', area_level: 1 },
  { area_id: '10-13', name: '東京都', area_level: 2 },
  { area_id: '10-14', name: '神奈川県', area_level: 2 },
  { area_id: '10-13-A001', name: '新宿区', area_level: 3 },
  { area_id: '10-13-A002', name: '渋谷区', area_level: 3 },
]

// --- 3. 本番用ロジック（ここが肝です） ---
const getParentId = (id: string) => {
  const parts = id.split('-');
  return parts.length > 1 ? parts.slice(0, -1).join('-') : null;
};

const sharedStyles = html`
<style>
  .area-list-container { width: 100%; background: ${DESIGN.colors.background}; overflow: hidden; border: 1px solid ${DESIGN.colors.border}; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-radius: ${DESIGN.borderRadius}; }
  .area-header-ui { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f3f4f6; font-size: 0.85rem; font-weight: 600; color: #111827; background: ${DESIGN.colors.headerBg}; }
  .area-list-scroll { max-height: 300px; overflow-y: auto; }
  .area-item-ui { width: 100%; padding: 12px 16px; border: none; background: #fff; display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; color: ${DESIGN.colors.text}; cursor: pointer; border-bottom: 1px solid #f9fafb; transition: background 0.2s; }
  .area-item-ui:hover { background: ${DESIGN.colors.hoverBg}; color: ${DESIGN.colors.accent}; }
  .back-icon { cursor: pointer; padding-right: 8px; color: #9ca3af; font-size: 1.1rem; }
  .status-info { margin-top: 20px; padding: 12px; font-size: 0.8rem; color: #64748b; border-left: 4px solid ${DESIGN.colors.accent}; background: #f0f7ff; }
</style>
`;

// --- メイン画面 ---
test06.get('/', (c) => {
  return c.render(
    <>
      {sharedStyles}
      <div style="max-width: 400px; margin: 40px auto;">
        <header style="margin-bottom: 24px;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">エリア絞り込み検証</h2>
          <p style="font-size: 0.85rem; color: #64748b;">Path Enumeration形式・単一API設計</p>
        </header>

        {/* 本番環境：初回ロード時に parent_id 無しで叩く */}
        <div id="area-drilldown-root" hx-get="/_sandbox/test06/api" hx-trigger="load">
        </div>

        <div id="search-status" class="status-info">
          現在の絞り込み: <b>全国</b>
        </div>
      </div>
    </>
  )
})

// --- 本番統合型 API ---
// 💡 ポイント: 階層ごとにエンドポイントを分けず、parent_id ひとつで制御
test06.get('/api', (c) => {
  const parentId = c.req.query('parent_id') || null;
  
  // 1. 本番ではここで dbQueries.getSubAreas(db, parentId) を呼ぶ
  const currentLevel = parentId ? (MOCK_DB.find(m => m.area_id === parentId)?.area_level || 0) : 0;
  const subAreas = MOCK_DB.filter(m => {
    if (!parentId) return m.area_level === 1;
    return m.area_id.startsWith(`${parentId}-`) && m.area_level === currentLevel + 1;
  });

  // 2. 本番ではここで dbQueries.getAreaInfo(db, parentId) を呼ぶ
  const parentArea = parentId ? MOCK_DB.find(m => m.area_id === parentId) : null;

  // 3. 戻り先の計算 (ここが自動化の鍵)
  const backId = parentId ? getParentId(parentId) : null;
  const backUrl = `/_sandbox/test06/api${backId ? `?parent_id=${backId}` : ''}`;

  return c.html(html`
    <div class="area-list-container">
      <div class="area-header-ui">
        <div>
          ${parentId ? html`
            <span class="back-icon" hx-get="${backUrl}" hx-target="#area-drilldown-root">←</span>
          ` : ''}
          ${parentArea ? parentArea.name : 'エリアを選択'}
        </div>
        <span style="cursor:pointer; color:#9ca3af;" onclick="location.reload()">×</span>
      </div>
      
      <div class="area-list-scroll">
        ${subAreas.map(area => {
          // Level 3 (小エリア) なら検索実行、それ以外ならドリルダウン
          if (area.area_level === 3) {
            return html`
              <button class="area-item-ui" onclick="alert('area_id: ${area.area_id} で検索');">
                <span>${area.name}</span>
              </button>
            `;
          }
          return html`
            <button class="area-item-ui" 
                    hx-get="/_sandbox/test06/api?parent_id=${area.area_id}" 
                    hx-target="#area-drilldown-root">
              <span>${area.name}</span>
              <span style="font-size: 0.7rem; color: #d1d5db;">❯</span>
            </button>
          `;
        })}
      </div>

      <div id="search-status" hx-swap-oob="true" class="status-info">
        現在の絞り込み: <b>${parentArea ? parentArea.name : '全国'}</b>
      </div>
    </div>
  `)
})