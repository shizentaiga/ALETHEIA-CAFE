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

  // クエリパラメータの保持（URLSearchParams構築時に重複キーが消滅を防ぐ）
  const currentParams = new URLSearchParams()
  const allQueries = c.req.query()

  // 1. 先に attrs と q 以外の通常パラメータを詰め込む
  for (const key in allQueries) {
    if (key !== 'attrs' && key !== 'q' && key !== 'q-hidden') {
      currentParams.set(key, allQueries[key])
    }
  }

  // 2. 検索キーワードの抽出と正規化
  const queryArray = c.req.query('q');  // キーワード(カンマ区切りで1文字)
  const normalized = getNormalizedKeywords(queryArray);
  const q = joinKeywords(normalized);

  // 安全にURLSearchParamsへ再セット
  if (normalized.length > 0) {
    currentParams.set('q', normalized.join(','));
  }

  // 💡 2.5 特徴検索パラメータ(attrs)の抽出と型安全な正規化
  const rawAttrQuery = c.req.query('attrs');  // 特徴(attrs)＝カンマ区切りの文字列
  const attrs = getNormalizedAttributes(rawAttrQuery);

  // 💡 安全にURLSearchParamsへ再セット（SearchArea等のコンポーネントへ引き継ぐため）
  if (attrs.length > 0) {
    currentParams.set('attrs', attrs.join(','));
  }

  // 3. エリア特定：URL指定がなければCDN位置情報をフォールバック
  const urlArea = c.req.query('area');
  const area = urlArea || await resolveDetectionArea(c, db);

  // 取得した現在地をドリルダウンの初期値に反映
  if (!urlArea && area) {
    currentParams.set('area', area);
  }

  // 💡 3.5 ページ番号の抽出と受け渡し
  const urlPage = c.req.query('page');
  const page = urlPage ? Math.max(1, parseInt(urlPage, 10) || 1) : 1;
  currentParams.set('page', String(page));

  // 4. ユーザーセッションの確認
  const userId = getCookie(c, 'aletheia_session');
  const user = userId ? {} : null;

  // 4.5 エリア情報（座標と名前）を取得
  const areaInfo = await fetchAreaCoordInfo(db, area ?? '00');

  // 基準座標オブジェクトの構築
  const baseCoords = (areaInfo && areaInfo.lat !== null && areaInfo.lng !== null) 
  ? { lat: areaInfo.lat, lng: areaInfo.lng } 
  : undefined;
  
  // 5. DBから店舗データ取得(attrs を条件に追加)
  const { results, total } = await fetchServices({
    db, 
    q, 
    page, 
    area,
    attrs, // 💡 正規化済みの特徴配列（例: ['wifi', 'outlets']）をクエリに渡す
    userCoords: baseCoords,
    sortBy: baseCoords ? 'near' : 'latest' 
  });

  // 6. 構築したデータを各コンポーネントへ渡し、ページをレンダリング
  return c.render(
    <>
      <TopHeader user={user} areaName={areaInfo.name} attrs={attrs} />

      <TopMain 
        results={results} 
        total={total} 
        q={q} 
        area={area} 
        attrs={attrs}
        areaName={areaInfo.name}
        page={page}
        currentParams={currentParams} 
      />

      <TopFooter />
    </>
  );
});