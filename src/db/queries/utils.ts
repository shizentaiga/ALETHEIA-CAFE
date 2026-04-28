/**
 * [File Path] src/db/queries/utils.ts
 */

export const isTruthy = (v: any): boolean => 
  v === true || v === 1 || v === 'OK' || v === 'yes';

export const cleanSql = (col: string) => `REPLACE(REPLACE(${col}, '　', ''), ' ', '')`;