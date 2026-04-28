/**
 * [File Path] src/db/queries/main.ts
 * [Role] クエリ層の統合エントリーポイント
 * [Notes] 外部（API層など）はこのファイルを介して、検索やデータ変換機能を利用します。
 */

import { fetchServices } from './search';
import { formatAttributes } from './transformers';

/**
 * dbQueries オブジェクト形式での提供
 * インポート時に `dbQueries.fetchServices` のように名前空間を分けて利用可能です。
 */
export const dbQueries = {
  fetchServices,
  formatAttributes,
};

/**
 * 名前付きエクスポートでの提供
 * `import { fetchServices } from './main'` のように直接的なインポートも可能です。
 */
export { fetchServices, formatAttributes };