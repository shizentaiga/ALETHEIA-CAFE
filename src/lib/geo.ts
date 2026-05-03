import { Context } from 'hono'
import { getPrefectureName } from './constants'

/**
 * Resolve the most appropriate area (prefecture name) from the request.
 * Priority: 1. URL query parameters, 2. CDN (Cloudflare) location data.
 */
export const resolveDetectionArea = (c: Context): string | undefined => {
  // 1. Check URL parameters (?area=...)
  const queryArea = c.req.query('area')
  if (queryArea) return queryArea

  // 2. Fallback to CDN (Cloudflare Workers) geolocation data
  // const cf = (c.req.raw as any).cf
  // if (cf?.country === 'JP' && cf.regionCode) {
  //   return getPrefectureName(cf.regionCode) || undefined
  // }

  return undefined
}