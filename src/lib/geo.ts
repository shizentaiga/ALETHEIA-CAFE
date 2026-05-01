import { Context } from 'hono'
import { getPrefectureName } from './constants'

/**
 * リクエストから最適なエリア（都道府県名）を特定する
 * 優先順位: 1. URLクエリパラメータ, 2. CDN(Cloudflare)の位置情報
 */
export const resolveDetectionArea = (c: Context): string | undefined => {
  // 1. URLパラメータ (?area=...)
  const queryArea = c.req.query('area')
  if (queryArea) return queryArea

  // 2. CDN (Cloudflare Workers) の地理情報
  const cf = (c.req.raw as any).cf
  if (cf?.country === 'JP' && cf.regionCode) {
    return getPrefectureName(cf.regionCode) || undefined
  }

  return undefined
}