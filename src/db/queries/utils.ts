/**
 * [File Path] src/db/queries/utils.ts
 * [Role] SQL construction helpers and common data validation logic.
 * [Notes] Utilities to maintain consistent criteria across the project.
 */

/**
 * Checks if a value represents a truthy state.
 */
export const isTruthy = (v: any): boolean => 
  v === true || v === 1 || v === 'OK' || v === 'yes';

/**
 * SQL helper to normalize strings by removing spaces.
 */
export const cleanSql = (col: string) => `REPLACE(REPLACE(${col}, '　', ''), ' ', '')`;