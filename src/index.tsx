import { Hono } from 'hono'

import { renderer } from './renderer'
import { home } from './pages/TopPage'
import { googleAuthApp } from './pages/GoogleAuth'
import { sandboxApp } from './_sandbox/_router'
import areaApp from './api/areaHandler'

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
app.use(renderer) // Apply common layout

/**
 * Route Modules
 */
app.route('/api/area', areaApp) // Area search API
app.route('/', googleAuthApp)   // Google OAuth2.0
app.route('/', home)            // Main application home

/**
 * Development Only
 */
app.route('/_sandbox', sandboxApp) // Prototyping area

export default app