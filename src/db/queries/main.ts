/**
 * [File Path] src/db/queries/main.ts
 * [Role] クエリ層の統合エクスポート窓口（Single Entry Point）
 */

import { fetchServices, fetchAreaCoordInfo } from './searchQuery';
import { formatAttributes } from './transformers';
import * as areaQueries from './areaQuery';
import * as stationQueries from './stationQuery'; // 駅マスタ系も統合

/**
 * 1. オブジェクト形式でのエクスポート (Namespace用)
 * 使用例: import { dbQueries } from '@/db/queries/main';
 *         dbQueries.resolveAreaByRegionCode(db, code);
 */
export const dbQueries = {
  fetchServices,
  fetchAreaCoordInfo, // 追加
  formatAttributes,
  ...areaQueries,
  ...stationQueries,
};

/**
 * 2. 名前付きエクスポート (個別のインポート用)
 * 使用例: import { resolveAreaByRegionCode } from '@/db/queries/main';
 */
export { fetchServices, fetchAreaCoordInfo, formatAttributes };
export * from './areaQuery';
export * from './stationQuery';