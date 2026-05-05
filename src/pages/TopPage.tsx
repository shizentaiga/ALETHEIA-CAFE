/**
 * [File Path] src/pages/TopPage.tsx
 * [Role] Main entry point for the top page.
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

  // 1. 検索キーワード(q)の抽出と正規化
  const queryArray = c.req.queries('q');
  const normalized = getNormalizedKeywords(queryArray); // 最大5件
  const q = joinKeywords(normalized); // スペース区切り

  // 2. 検索対象エリアの決定 (URL指定を優先、なければ現在地)
  const area = c.req.query('area') || resolveDetectionArea(c);

  // 3. ユーザーセッションの確認（DBアクセスを省略）
  const userId = getCookie(c, 'aletheia_session');
  const user = userId ? {} : null;
  
  // 4. キーワードとエリアに基づき、DBから対象サービスを取得（メイン処理）
  const { results, total } = await fetchServices(db, q, 1, area);

  // 5. 構築したデータを各コンポーネントへ渡し、ページをレンダリング
  return c.render(
    <>
      <TopHeader user={user} results={results} total={total} area={area} q={q} />
      <TopMain results={results} total={total} area={area} q={q} />
      <TopFooter />
    </>
  );
});