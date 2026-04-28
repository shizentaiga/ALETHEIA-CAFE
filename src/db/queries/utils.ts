/**
 * [File Path] src/db/queries/utils.ts
 * [Role] SQL構築およびデータ判定の最小単位となるユーティリティ
 * [Notes] プロジェクト全体で一貫したロジック（表記揺れ対策等）を保証するための「道具箱」です。
 */

/**
 * 共通ユーティリティ: 真偽値（またはそれに準ずる値）を判定
 * DB（D1）から返ってくる可能性のある様々な「肯定値」を、プログラムで扱いやすい boolean に集約します。
 * @param v 判定対象の値（D1の戻り値、JSON属性など）
 */
export const isTruthy = (v: any): boolean => 
  v === true || v === 1 || v === 'OK' || v === 'yes';

/**
 * SQL構築用：表記揺れ対策（スペース除去）のSQL句を生成
 * DB側のカラム値に含まれる全角・半角スペースを除去して比較するために利用します。
 * 検索キーワード側も同様の正規化を行うことで、精度の高いマッチングを実現します。
 * @param col 対象となるテーブルのカラム名（例: 'title', 'address'）
 * @returns REPLACE関数を入れ子にしたSQL文字列
 */
export const cleanSql = (col: string) => `REPLACE(REPLACE(${col}, '　', ''), ' ', '')`;