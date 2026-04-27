import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'

export default defineConfig({
  plugins: [
    cloudflare(), 
    ssrPlugin()
  ],
  build: {
    rollupOptions: {
      /**
       * index.htmlが存在しない構成のため、
       * 明示的にアプリケーションのエントリポイントを指定します。
       */
      input: './src/index.tsx'
    }
  }
})