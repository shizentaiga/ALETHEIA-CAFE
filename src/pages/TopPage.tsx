/**
 * [File Path] src/pages/TopPage.tsx
 */

import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';

import { TopHeader } from './TopHeader';
import { TopMain } from './TopMain';
import { TopFooter } from './TopFooter';

import { fetchServices, getAreaInfo, fetchAreaCoordInfo } from '../db/queries/main';
import { resolveDetectionArea } from '../lib/geo';
import { getNormalizedKeywords, joinKeywords } from '../lib/searchUtils';

type Bindings = {
  ALETHEIA_CAFE_DB: D1Database;
};

export const home = new Hono<{ Bindings: Bindings }>();

home.get('/', async (c) => {
  const db = c.env.ALETHEIA_CAFE_DB;

  // 1. クエリパラメータの保持（コンポーネントへの引き継ぎ用バトン）
  const currentParams = new URLSearchParams(c.req.query());

  // 2. 検索キーワードの抽出と正規化
  const queryArray = c.req.queries('q');
  const normalized = getNormalizedKeywords(queryArray);
  const q = joinKeywords(normalized);

  // 3. エリア特定：URL指定がなければCDN位置情報をフォールバック
  const urlArea = c.req.query('area');
  const area = urlArea || await resolveDetectionArea(c, db);

  // 取得した現在地をドリルダウンの初期値に反映
  if (!urlArea && area) {
    currentParams.set('area', area);
  }

  // 4. ユーザーセッションの確認
  const userId = getCookie(c, 'aletheia_session');
  const user = userId ? {} : null;

  // 4.5 エリア情報（座標と名前）を取得
  const areaInfo = await fetchAreaCoordInfo(db, area ?? '00');

  // 基準座標オブジェクトの構築
  const baseCoords = (areaInfo?.lat !== null && areaInfo?.lng !== null) 
  ? { lat: areaInfo!.lat, lng: areaInfo!.lng } 
  : undefined;
  
  // 5. DBから店舗データと表示用エリア名を取得(resultsには、nearestStationとaccess含む)
  const { results, total } = await fetchServices({
    db, 
    q, 
    page: 1, 
    area,
    userCoords: baseCoords,
    sortBy: baseCoords ? 'near' : 'latest' 
  });

  // 6. 構築したデータを各コンポーネントへ渡し、ページをレンダリング
  return c.render(
    <>
      <TopHeader user={user} areaName={areaInfo.name} />
      <TopMain 
        results={results} 
        total={total} 
        area={area} 
        q={q} 
        areaName={areaInfo.name}
        currentParams={currentParams} 
      />
      <TopFooter />
    </>
  );
});