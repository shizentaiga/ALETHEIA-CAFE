/**
 * [File Path] src/pages/header/HeaderAuth.tsx
 * [Role] Handles authentication links (Login/Logout).
 */
import type { FC } from 'hono/jsx'

interface HeaderAuthProps {
  user?: any;
  loginLabel: string;
  logoutLabel: string;
}

export const HeaderAuth: FC<HeaderAuthProps> = ({ user, loginLabel, logoutLabel }) => {
  return (
    <div class="header-auth">
      {user ? (
        <span class="login-link">
          <a href="/logout" class="login-link">
            {logoutLabel} 
          </a>
        </span>
      ) : (
        <a href="/auth/google" class="login-link">{loginLabel}</a>
      )}
    </div>
  )
}