/**
 * [File Path] src/pages/TopPage.tsx
 */

import { Hono } from 'hono';
import { TopHeader } from './TopHeader';
import { TopMain } from './TopMain';
import { TopFooter } from './TopFooter';
import { fetchServices } from '../db/queries/main';
import { getCookie } from 'hono/cookie';
import { resolveDetectionArea } from '../lib/geo';
import { getNormalizedKeywords, joinKeywords } from '../lib/searchUtils';

type Bindings = {
  ALETHEIA_CAFE_DB: D1Database;
};

export const home = new Hono<{ Bindings: Bindings }>();

home.get('/', async (c) => {
  const db = c.env.ALETHEIA_CAFE_DB;

  // 1. 全てのクエリパラメータをURLSearchParamsオブジェクトとして取得
  // 💡 これが SearchArea までのバケツリレーの「容器」になります
  const currentParams = new URLSearchParams(c.req.query());

  // 2. 検索キーワード(q)の抽出と正規化
  const queryArray = c.req.queries('q');
  const normalized = getNormalizedKeywords(queryArray);
  const q = joinKeywords(normalized);

  // 3. 検索対象エリアの決定 (URL指定を優先、なければ現在地)
  const area = c.req.query('area') || resolveDetectionArea(c);

  // 4. ユーザーセッションの確認
  const userId = getCookie(c, 'aletheia_session');
  const user = userId ? {} : null;
  
  // 5. DBから対象サービスを取得
  const { results, total, areaName } = await fetchServices(db, q, 1, area);

  // 6. 構築したデータを各コンポーネントへ渡し、ページをレンダリング
  return c.render(
    <>
      <TopHeader user={user} q={q} />
      {/* 💡 TopMain に currentParams を渡します */}
      <TopMain 
        results={results} 
        total={total} 
        area={area} 
        q={q} 
        areaName={areaName}
        currentParams={currentParams} 
      />
      <TopFooter />
    </>
  );
});