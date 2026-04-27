import type { FC } from 'hono/jsx'

// --- Configuration (文言・設定) ---
const HEADER_CONFIG = {
  logoText: 'ALETHEIA',
  navItems: [
    { label: 'ログイン' },
    { label: 'ログアウト' }
  ]
} as const

// --- Styles (デザイン・装飾) ---
const STYLES = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 24px',
    height: '68px',
    borderBottom: '1px solid #f1f1f1',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(10px)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10
  },
  logo: {
    fontFamily: '"Times New Roman", "Georgia", serif',
    fontSize: '1.28rem',
    fontWeight: 500,
    letterSpacing: '0.06em',
    color: '#0f172a',
    userSelect: 'none' as const
  },
  nav: {
    display: 'flex',
    alignItems: 'center'
  },
  button: {
    padding: '6px 14px',
    borderRadius: '999px',
    border: '1px solid #eee',
    fontSize: '0.82rem',
    color: '#64748b',
    textDecoration: 'none',
    marginLeft: '8px',
    cursor: 'default'
  }
} as const

// --- Component ---
export const TopHeader: FC = () => {
  return (
    <header style={STYLES.header}>
      {/* ロゴ部分 */}
      <div style={STYLES.logo}>
        {HEADER_CONFIG.logoText}
      </div>

      {/* 右側ナビゲーション */}
      <nav style={STYLES.nav}>
        {HEADER_CONFIG.navItems.map((item) => (
          <span key={item.label} style={STYLES.button}>
            {item.label}
          </span>
        ))}
      </nav>
    </header>
  )
}