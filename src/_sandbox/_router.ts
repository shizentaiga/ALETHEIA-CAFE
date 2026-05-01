/**
 * =============================================================================
 * 【 ALETHEIA - 開発実験場 (Sandbox) ルーター 】
 * 各種テストモジュールを集約し、/_sandbox 配下のパスを管理します。
 * =============================================================================
 */

import { Hono } from 'hono'
import { trimTrailingSlash } from 'hono/trailing-slash'

// [1. テストモジュールのインポート]
// 新しい実験用ファイルを作成するたびに、ここに追加します
import { test00 } from './test00_hello'
import { test01 } from './test01_db'
import { test02 } from './test02_oauth'
import { test03 } from './test03_htmx'
import { test04 } from './test04_query'
import { test05 } from './test05_cdn'

export const sandboxApp = new Hono<{}>()

/**
 * [2. ミドルウェア]
 * 末尾スラッシュの有無を正規化し、ルーティングの不整合を防止します。
 */
sandboxApp.use('*', trimTrailingSlash())

/**
 * [3. ルーティング登録]
 * インポートした各モジュールを特定のエンドポイントに紐付けます。
 * 例: /_sandbox/test00 でアクセス可能
 */
sandboxApp.route('/test00', test00)
sandboxApp.route('/test01', test01)
sandboxApp.route('/test02', test02)
sandboxApp.route('/test03', test03)
sandboxApp.route('/test04', test04)
sandboxApp.route('/test05', test05)

