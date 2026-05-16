import type { FC } from 'hono/jsx'

/**
 * [ファイルパス] src/pages/TopFooter.tsx
 * [役割] ホームへのコピーライトリンクを持つフッターコンポーネント
 * [注意点] PSI（PageSpeed Insights）のコントラスト比を考慮した配色を維持。
 */

// --- 設定 ---
const FOOTER_CONFIG = {
  copyright: `© 2026 ALETHEIA`,
} as const

// --- スタイル定義 ---
const STYLES = {
  footer: {
    width: '100%',
    padding: '40px 0 32px',
    borderTop: '1px solid #f8fafc',
    backgroundColor: '#ffffff',
    textAlign: 'center' as const,
    marginTop: 'auto'
  },
  /**
   * PSIを考慮した濃いめの色（#475569）をベースに、
   * わずかな文字間隔を加えてロゴとしての質感を調整。
   */
  homeLink: {
    display: 'inline-block',
    fontFamily: '"Times New Roman", "Georgia", serif',  // ロゴと同じフォントファミリーを適用
    fontSize: '0.85rem',
    color: '#475569', // 視認性の高い濃いめのグレーを維持
    textDecoration: 'none',
    fontWeight: 500,
    letterSpacing: '0.08em', // 💡 ロゴの letter-spacing: 0.08em と歩調を合わせる
    transition: 'color 0.2s ease', // 💡 ホバー時の変化を滑らかに
  }
} as const

// --- コンポーネント ---
export const TopFooter: FC = () => {
  return (
    <footer style={STYLES.footer}>
      <nav aria-label="フッターナビゲーション">
        {/* ロゴ（コピーライト）クリック時、トップへ戻る */}
        <a 
          href="/" 
          style={STYLES.homeLink}
          /**
           * [TypeScript] as HTMLElement で型を明示し、
           * かつ if 文で null チェックを行うことで安全にスタイルを変更
           */
          onMouseOver={(e) => {
            const el = e.currentTarget as HTMLElement;
            if (el) el.style.color = '#0f172a'; // ホバー時はさらに濃い黒に
          }}
          onMouseOut={(e) => {
            const el = e.currentTarget as HTMLElement;
            if (el) el.style.color = '#475569'; // 元のPSI配慮色に戻す
          }}
        >
          {FOOTER_CONFIG.copyright}
        </a>
      </nav>
    </footer>
  )
}