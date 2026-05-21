/**
 * scripts/utils.ts
 * * データ処理のためのユーティリティ関数と共有設定。
 * ファイルパス、タイミング、ディレクトリ管理を処理します。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM環境用のパス定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ブランドIDを生成するユーティリティ
 * 例: "KOMEDA" -> "brand_komeda"
 */
export const getBrandId = (name: string) => `brand_${name.toLowerCase()}`;

/**
 * 動作パラメータ設定
 * ブランドID、オーナーID、およびリクエストの制御値を管理します。
 */
export const CONFIG = {
    // 各ブランドの一意の識別子（ブランドを追加する場合はここへ追記してください）
    BRANDS: {
        STARBUCKS: getBrandId('STARBUCKS'),
        DOUTOR: getBrandId('DOUTOR'),
        KOMEDA: getBrandId('KOMEDA'),
        MISTERDONUTS: getBrandId('MISTERDONUTS'),
        TULLYS: getBrandId('TULLYS'),
    },
    OWNER_ID: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    WAIT_LONG: 2000,    // 大規模なデータチャンク間の待機時間 (ms)
    WAIT_SHORT: 2000,   // 個別のページ間の待機時間 (ms)
    CONCURRENCY: 3      // 同時実行リクエスト数
};

/**
 * パス設定: ディレクトリの場所を一元管理
 * 正確な絶対パスを保証するために path.resolve を使用します。
 */
export const PATHS = {
    RAW_DATA: path.resolve(__dirname, 'data/raw'),
    DB_SEED: path.resolve(__dirname, '../src/db/seed/brands'),
};

/**
 * 指定した時間、実行を一時停止するユーティリティ
 * @param ms - 待機するミリ秒数
 */
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * ディレクトリの存在確認と作成
 * ディレクトリが存在しない場合、再帰的に作成します。
 * @param dir - 対象ディレクトリのパス
 */
export function ensureDirectory(dir: string) {
    if (!fs.existsSync(dir)) {
        // 親ディレクトリを含めて作成することでエラーを防止
        fs.mkdirSync(dir, { recursive: true });
    }
}