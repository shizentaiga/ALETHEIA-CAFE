import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PATHS = {
    RAW_DATA: path.resolve(__dirname, 'data/raw'),
    DB_SEED: path.resolve(__dirname, '../src/db/seed/chains'),
};

export const CONFIG = {
    DB_ID: 'brand_starbucks',
    OWNER_ID: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    WAIT_LONG: 2000,
    WAIT_SHORT: 2000,
    CONCURRENCY: 5
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function ensureDirectory(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}