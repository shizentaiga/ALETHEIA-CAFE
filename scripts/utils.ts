/**
 * Utility functions and shared configurations for data processing.
 * This file handles file paths, timing, and directory management.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define the current file and directory path for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * PATHS: Centralized directory locations.
 * Use path.resolve to ensure correct absolute paths.
 */
export const PATHS = {
    RAW_DATA: path.resolve(__dirname, 'data/raw'),
    DB_SEED: path.resolve(__dirname, '../src/db/seed/chains'),
};

/**
 * CONFIG: Operational parameters.
 * These values control API IDs and request intervals (throttling).
 */
export const CONFIG = {
    // ブランドごとのID管理
    BRANDS: {
        STARBUCKS: 'brand_starbucks',
        DOUTOR: 'brand_doutor', // ドトール用のIDを追加
    },
    OWNER_ID: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    WAIT_LONG: 2000,   // Wait time between large chunks (ms)
    WAIT_SHORT: 2000,  // Wait time between individual pages (ms)
    CONCURRENCY: 5     // Number of parallel requests allowed
};

/**
 * Utility to pause execution for a specific time.
 * @param ms - Milliseconds to sleep
 */
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if a directory exists. If not, create it.
 * @param dir - Target directory path
 */
export function ensureDirectory(dir: string) {
    if (!fs.existsSync(dir)) {
        // Create directory recursively to prevent errors
        fs.mkdirSync(dir, { recursive: true });
    }
}