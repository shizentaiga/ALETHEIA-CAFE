/**
 * [File Path] src/db/queries/main.ts
 * [Role] クエリ層の統合エントリーポイント（ゲートウェイ）
 * [Notes] 外部（API層）はこのファイルをインポートするだけで、必要な機能すべてにアクセス可能です。
 */

import { fetchServices } from './search';
import { transformService, formatAttributes } from './transformers';

/**
 * 検索ロジックおよびデータ整形機能の統合オブジェクト
 * 今後、エリア検索やカテゴリ検索用の新しい関数を追加した場合も、
 * ここに追加することで利用側のコードを変更せずに拡張可能です。
 */
export const dbQueries = {
  // サービス検索（キーワード、エリア、ページネーション対応）
  fetchServices,
  
  // データ整形ユーティリティ
  transformService,
  formatAttributes,
};

// 名前付きエクスポート：直接個別の関数をインポートしたい場合に使用
export { fetchServices, transformService, formatAttributes };