import { Hono } from 'hono'

import { renderer } from './renderer' // レンダラー
import { toppage } from './pages/TopPage' // トップページ
import { sandboxApp } from './_sandbox/_router' //サンドボックス

const app = new Hono()

app.use(renderer) // レンダラー
app.route('/', toppage)  // トップページ
app.route('/_sandbox', sandboxApp)  // サンドボックス

export default app