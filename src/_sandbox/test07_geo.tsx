import { Hono } from 'hono'

export const test07 = new Hono()

test07.get('/', (c) => {
  return c.render(
    <div style="padding: 20px; font-family: sans-serif;">
      <h2>現在地取得テスト（駅情報追加版）</h2>
      <button id="get-location-btn" style="padding: 10px 20px; cursor: pointer;">
        現在地を取得
      </button>

      <div id="status" style="margin-top: 15px; color: #666;"></div>
      
      <pre id="result" style="margin-top: 15px; background: #f3f4f6; padding: 15px; border-radius: 8px; display: none; overflow-x: auto;"></pre>

      <script dangerouslySetInnerHTML={{ __html: `
        const btn = document.getElementById('get-location-btn');
        const status = document.getElementById('status');
        const resultArea = document.getElementById('result');

        btn.addEventListener('click', () => {
          if (!navigator.geolocation) {
            status.textContent = 'お使いのブラウザは位置情報に対応していません。';
            return;
          }

          status.textContent = '取得中（ブラウザの許可を待っています...）';
          resultArea.style.display = 'none';

          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude, accuracy } = position.coords;
              
              status.textContent = '位置情報を取得しました。住所と駅を確認中...';

              // 1. 都道府県情報の取得 (OpenStreetMap)
              let addressData = '取得失敗';
              try {
                const res = await fetch(\`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${latitude}&lon=\${longitude}&zoom=10\`, {
                  headers: { 'Accept-Language': 'ja' }
                });
                const json = await res.json();
                addressData = json.address.province || json.address.city || '不明';
              } catch (e) {
                console.error('Address API Error:', e);
              }

              // 2. 最寄駅情報の取得 (HeartRails Express)
              let stationData = '取得失敗';
              try {
                // HeartRails Express API: x=経度, y=緯度
                const res = await fetch(\`https://express.heartrails.com/api/json?method=getStations&x=\${longitude}&y=\${latitude}\`);
                const json = await res.json();
                
                if (json.response && json.response.station && json.response.station.length > 0) {
                  const nearest = json.response.station[0]; // 0番目が最も近い駅
                  stationData = \`\${nearest.line} \${nearest.name}駅 (\${nearest.distance}m)\`;
                } else {
                  stationData = '近くに駅が見つかりませんでした';
                }
              } catch (e) {
                console.error('Station API Error:', e);
              }

              status.textContent = '完了';
              resultArea.style.display = 'block';
              resultArea.textContent = JSON.stringify({
                都道府県相当: addressData,
                最寄駅: stationData,
                緯度: latitude,
                経度: longitude,
                精度: \`±\${accuracy}m\`,
                取得時刻: new Date(position.timestamp).toLocaleString()
              }, null, 2);
            },
            (error) => {
              status.textContent = \`エラー: \${error.message}\`;
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        });
      ` }} />
    </div>
  )
})