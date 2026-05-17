/**
 * [File Path] src/pages/TopPage.tsx
 */

import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';

import { TopHeader } from './TopHeader';
import { TopMain } from './TopMain';
import { TopFooter } from './TopFooter';

import { fetchServices, fetchAreaCoordInfo } from '../db/queries/main';
import { resolveDetectionArea } from '../lib/geo';
import { getNormalizedKeywords, joinKeywords, getNormalizedAttributes } from '../lib/searchUtils';

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

  // 💡 2.5 特徴検索パラメータ(attrs)の抽出と型安全な正規化
  const attrArray = c.req.queries('attrs');
  const attrs = getNormalizedAttributes(attrArray);

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
  
  // 5. DBから店舗データ取得(attrs を条件に追加)
  const { results, total } = await fetchServices({
    db, 
    q, 
    page: 1, 
    area,
    // attrs, // 💡 正規化済みの特徴配列（例: ['wifi', 'outlets']）をクエリに渡す
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
        // attrs={attrs} // 💡 選択中のバッジ表示やUI制御のために念のため渡しておく
        areaName={areaInfo.name}
        currentParams={currentParams} 
      />
      <TopFooter />
    </>
  );
});