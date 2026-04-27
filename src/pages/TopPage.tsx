import { Hono } from 'hono'
import { TopHeader } from './TopHeader'
import { TopMain } from './TopMain'
import { TopFooter } from './TopFooter'

export const home = new Hono()

// --- Routes ---
home.get('/', (c) => {
  return c.render(
    <>
      <TopHeader />
      <TopMain />
      <TopFooter />
    </>
  )
})