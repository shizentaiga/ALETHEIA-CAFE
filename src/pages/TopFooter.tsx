import type { FC } from 'hono/jsx'

// --- Configuration ---
const FOOTER_CONFIG = {
  copyright: `© 2026 ${'ALETHEIA'}`,
  homeLabel: 'トップページ', // 💡 ラベルを定義
} as const

// --- Styles ---
const STYLES = {
  footer: {
    width: '100%',
    padding: '32px 0 24px', // 💡 上の余白を少し増やしてバランス調整
    borderTop: '1px solid #f1f1f1',
    backgroundColor: '#ffffff',
    textAlign: 'center' as const,
    marginTop: 'auto' // これにより、上のコンテンツが少なくても下に押し出されます
  },
  // 💡 トップへ戻るリンクのスタイル
  homeLink: {
    display: 'inline-block',
    marginBottom: '12px',
    fontSize: '0.85rem',
    color: '#475569', // コピーライトより少し濃い色にして視認性を確保
    textDecoration: 'none',
    fontWeight: 500
  },
  text: {
    fontSize: '0.82rem',
    color: '#64748b',
    margin: 0,
    fontWeight: 400
  }
} as const

// --- Component ---
export const TopFooter: FC = () => {
  return (
    <footer style={STYLES.footer}>
      {/* 💡 トップへ戻るリンクを追加 */}
      <nav>
        <a href="/" style={STYLES.homeLink}>
          {FOOTER_CONFIG.homeLabel}
        </a>
      </nav>
      
      <p style={STYLES.text}>
        {FOOTER_CONFIG.copyright}
      </p>
    </footer>
  )
}