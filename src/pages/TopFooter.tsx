import type { FC } from 'hono/jsx'

// --- Configuration ---
const FOOTER_CONFIG = {
  copyright: `© 2026 ${'ALETHEIA'}`,
} as const

// --- Styles ---
const STYLES = {
  footer: {
    width: '100%',
    padding: '24px 0',
    borderTop: '1px solid #f1f1f1',
    backgroundColor: '#ffffff',
    textAlign: 'center' as const,
    marginTop: 'auto' // これにより、上のコンテンツが少なくても下に押し出されます
  },
  text: {
    fontSize: '0.82rem',
    color: '#94a3b8',
    margin: 0
  }
} as const

// --- Component ---
export const TopFooter: FC = () => {
  return (
    <footer style={STYLES.footer}>
      <p style={STYLES.text}>
        {FOOTER_CONFIG.copyright}
      </p>
    </footer>
  )
}