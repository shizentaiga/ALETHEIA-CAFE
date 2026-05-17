import { Hono } from 'hono'

import { renderer } from './renderer'
import { htmlMinifier } from './middleware/htmlMinifier'

import { home } from './pages/TopPage'
import { googleAuthApp } from './pages/GoogleAuth'
import { sandboxApp } from './_sandbox/_router'
import areaApi from './api/areaDrilldown'
import attributeApi from './api/attributeSearch'

/**
 * Cloudflare environment variables for c.env
 */
type Bindings = {
  // Add wrangler.toml variables (e.g. DB: D1Database)
}

const app = new Hono<{ Bindings: Bindings }>()

/**
 * Global Middlewares
 */
app.use(htmlMinifier()) // HTML配信時に不要なコメントアウトを削除
app.use(renderer) // Apply common layout

/**
 * Route Modules
 */
app.route('/api/area-drilldown', areaApi)         // SearchArea.tsxのパスと一致
app.route('/api/attribute-search', attributeApi)  // SearchAttribute.tsxのパスと一致
app.route('/', googleAuthApp)   // Google OAuth2.0
app.route('/', home)            // Main application home

/**
 * Development Only
 */
app.route('/_sandbox', sandboxApp) // Prototyping area

export default app