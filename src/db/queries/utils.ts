/**
 * [File Path] src/db/queries/utils.ts
 * [Role] SQL構築の補助およびデータ判定の共通ロジック
 * [Notes] 表記揺れ対策や真偽判定など、プロジェクト全体で一貫した基準を保つためのユーティリティです。
 */

export const isTruthy = (v: any): boolean => 
  v === true || v === 1 || v === 'OK' || v === 'yes';

export const cleanSql = (col: string) => `REPLACE(REPLACE(${col}, '　', ''), ' ', '')`;