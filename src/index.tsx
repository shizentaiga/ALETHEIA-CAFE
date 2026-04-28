import { Hono } from 'hono'
import { renderer } from './renderer'       // 共通レイアウト定義
import { home } from './pages/TopPage'    // 本番: ホーム
import { googleAuthApp } from './pages/GoogleAuth' // Google認証用(OAuht2.0)
import { sandboxApp } from './_sandbox/_router' // 開発: 実験場

const app = new Hono()

app.use(renderer)                  // 全ルートにレイアウト適用
app.route('/', googleAuthApp)   // 認証ルートを登録
app.route('/', home)            // メインページ
app.route('/_sandbox', sandboxApp) // 開発用エンドポイント

export default app