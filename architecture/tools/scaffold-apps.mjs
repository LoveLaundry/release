/**
 * Generates the three new apps from one template.
 *
 * Why a generator instead of three hand-written scaffolds: the apps must never
 * drift apart in auth, error handling or routing. One template means one place
 * to change, and the three repos stay byte-identical except for their config.
 *
 *   node scaffold-apps.mjs <target-directory>
 *
 * Each generated app is a standalone Vite + React + TS project with:
 *   · namespaced session storage (no key collisions with quotations-ui)
 *   · a guarded router
 *   · staff or client sign-in, chosen per app
 *   · typed API clients pointed at the real services
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const target = process.argv[2]
if (!target) {
  console.error('usage: node scaffold-apps.mjs <target-directory>')
  process.exit(1)
}

const apps = [
  {
    dir: 'shop-app',
    name: 'shop-counter',
    title: 'Shop Counter',
    tagline: 'Billing and day close for shop customers',
    port: 5174,
    storageKey: 'll_shop_session',
    authKind: 'staff',
    accent: '#2563eb',
    deployDomain: 'shop.lovelaundry.lk',
    nav: [
      {
        path: '/',
        label: 'Today',
        endpoint: 'GET /shop-bills/stats/overview',
        blurb: 'Open bills, takings and what is waiting at the counter.',
      },
      {
        path: '/bills',
        label: 'Bills',
        endpoint: 'GET /shop-bills',
        blurb: 'Every shop bill with status, client and balance.',
      },
      {
        path: '/quick-bill',
        label: 'Quick bill',
        endpoint: 'POST /shop-bills/quick-bill',
        blurb: 'Counter sale in a few taps, no customer record required.',
      },
      {
        path: '/day-close',
        label: 'Day close',
        endpoint: 'GET /day-close',
        blurb: 'Cash counted against what the system recorded.',
      },
    ],
  },
  {
    dir: 'hotel-app',
    name: 'hotel-desk',
    title: 'Hotel Desk',
    tagline: 'Your account with Love Laundry',
    port: 5175,
    storageKey: 'll_hotel_session',
    authKind: 'client',
    accent: '#0f766e',
    deployDomain: 'hotel.lovelaundry.lk',
    nav: [
      {
        path: '/',
        label: 'Overview',
        endpoint: 'GET /client-portal/summary',
        blurb: 'This month at a glance: pieces in, pieces out, amount due.',
      },
      {
        path: '/gate-passes',
        label: 'Gate passes',
        endpoint: 'GET /client-portal/gate-passes',
        blurb: 'Every collection from your property, with piece counts.',
      },
      {
        path: '/deliveries',
        label: 'Deliveries',
        endpoint: 'GET /client-portal/deliveries',
        blurb: 'What came back, when, and what was short.',
      },
      {
        path: '/invoices',
        label: 'Invoices',
        endpoint: 'GET /client-portal/bills',
        blurb: 'Invoices and their settlement status.',
      },
    ],
  },
  {
    dir: 'linen-room-app',
    name: 'linen-room',
    title: 'Linen Room',
    tagline: 'Scan in, scan out, keep the count honest',
    port: 5176,
    storageKey: 'll_linen_session',
    authKind: 'staff',
    accent: '#7c3aed',
    deployDomain: 'linen.lovelaundry.lk',
    nav: [
      {
        path: '/',
        label: 'Scan',
        endpoint: 'POST /linens/{id}/scan',
        blurb: 'Camera or gun scanner: collect, receive, ready, deliver.',
      },
      {
        path: '/inventory',
        label: 'Inventory',
        endpoint: 'GET /linens',
        blurb: 'Where every tagged piece is right now.',
      },
      {
        path: '/discrepancies',
        label: 'Discrepancies',
        endpoint: 'GET /linens/stats/summary',
        blurb: 'Missing and damaged pieces that need a decision.',
      },
      {
        path: '/tags',
        label: 'Tags',
        endpoint: 'POST /linens/generate-tags',
        blurb: 'Print new tags for pieces entering circulation.',
      },
    ],
  },
]

const json = (value) => JSON.stringify(value, null, 2) + '\n'

function files(app) {
  const isClient = app.authKind === 'client'
  const loginPath = isClient ? '/client/auth/login' : '/auth/login'
  const statusPath = isClient ? '/client/auth/status' : '/auth/status'

  return {
    'package.json': json({
      name: app.name,
      private: true,
      version: '0.1.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'tsc --noEmit && vite build',
        preview: 'vite preview',
      },
      dependencies: {
        axios: '^1.19.0',
        clsx: '^2.1.1',
        react: '^19.2.8',
        'react-dom': '^19.2.8',
        'react-router-dom': '^7.18.2',
      },
      devDependencies: {
        '@tailwindcss/vite': '^4.3.3',
        '@types/react': '^19.2.17',
        '@types/react-dom': '^19.2.3',
        '@vitejs/plugin-react': '^4.7.0',
        tailwindcss: '^4.3.3',
        typescript: '~6.0.2',
        vite: '^6.3.5',
      },
    }),

    'tsconfig.json': json({
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        moduleResolution: 'bundler',
        jsx: 'react-jsx',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        isolatedModules: true,
        verbatimModuleSyntax: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
        types: ['vite/client'],
      },
      include: ['src'],
    }),

    'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: ${app.port},
    // Two apps open at once must not fight over the same port.
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('axios')) return 'vendor-http'
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react'
          return undefined
        },
      },
    },
  },
})
`,

    'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="${app.accent}" />
    <title>${app.title} — Love Laundry</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,

    '.gitignore': `node_modules
dist
.env
.env.local
*.local
.DS_Store
.vite
`,

    '.env.example': `# Same-origin proxy routes from vercel.json work on every deployment.
# Override them only when calling a service directly.
VITE_USER_API_URL=/api/user
VITE_BILL_API_URL=/api/bills

# Direct service URLs (local development or custom proxy):
# VITE_USER_API_URL=http://localhost:8002
# VITE_BILL_API_URL=http://localhost:8001
`,

    'vercel.json': json({
      $schema: 'https://openapi.vercel.sh/vercel.json',
      framework: 'vite',
      buildCommand: 'npm run build',
      outputDirectory: 'dist',
      rewrites: [
        { source: '/api/user/:path*', destination: 'https://love-laundry-user-service.vercel.app/:path*' },
        { source: '/api/bills/:path*', destination: 'https://bill-service-puce.vercel.app/:path*' },
        { source: '/(.*)', destination: '/index.html' },
      ],
    }),

    'README.md': `# ${app.title}

${app.tagline}. Standalone app for ${isClient ? 'hotel customers' : 'our own staff'};
it talks to the existing services and owns no data of its own.

- **Deploy target:** ${app.deployDomain}
- **Dev port:** ${app.port}
- **Sign-in:** \`POST ${loginPath}\`
- **Session storage:** \`${app.storageKey}\` (namespaced — never shared with another app)

## Rules this app must keep

1. The tenant comes from the JWT only, never from a URL, body or query string.
2. Money is computed by \`bill_service\`. This app never re-adds totals.
3. Nothing is written to a new collection. If the API cannot do it, the API is
   extended first.

## Run

\`\`\`bash
npm install
npm run dev     # http://localhost:${app.port}
npm run build   # tsc --noEmit && vite build
\`\`\`
`,

    'src/vite-env.d.ts': `/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USER_API_URL?: string
  readonly VITE_BILL_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
`,

    'src/session.ts': `/**
 * Session storage for this app only.
 *
 * Each app uses its own key (\`${app.storageKey}\`) instead of the shared
 * \`ll_token\` used by the laundry app. If two apps are ever served from one
 * host, neither can read the other's session or hand a token to the wrong API.
 */
export interface SessionUser {
  name: string
  role: string
  laundry?: string
  /** Hotel name — only ever set for client sessions. */
  clientName?: string
}

export interface Session {
  token: string
  user: SessionUser
}

const KEY = '${app.storageKey}'

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Session
    if (!parsed?.token || !parsed?.user) return null
    return parsed
  } catch {
    return null
  }
}

export function writeSession(session: Session): void {
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(KEY)
}

export function getToken(): string | null {
  return readSession()?.token ?? null
}

/** True when the JWT has already expired, so the UI can drop it before a 401. */
export function isExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''))
    return typeof payload?.exp === 'number' && payload.exp * 1000 < Date.now()
  } catch {
    return false
  }
}
`,

    'src/api/client.ts': `import axios from 'axios'
import { clearSession, getToken } from '../session'

/** Sign-in, session status, and hotel client auth. */
export const authApi = axios.create({
  baseURL: import.meta.env.VITE_USER_API_URL ?? '/api/user',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

/** Operational data (bills, gate passes, linens, ...). */
export const dataApi = axios.create({
  baseURL: import.meta.env.VITE_BILL_API_URL ?? '/api/bills',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

for (const instance of [authApi, dataApi]) {
  instance.interceptors.request.use((config) => {
    const token = getToken()
    if (token) config.headers.Authorization = \`Bearer \${token}\`
    return config
  })

  instance.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined
      // Only 401 means "this session is gone". A 403 means the account exists
      // but may not do this — dropping the session there would sign out a user
      // for opening a page they were never allowed to see.
      if (status === 401) {
        clearSession()
        if (!window.location.pathname.startsWith('/login')) {
          window.location.assign('/login')
        }
      }
      return Promise.reject(error)
    },
  )
}

/** One selectable tenant from an ambiguous client login. */
export interface LaundryChoice {
  id: string
  name: string
  clientType?: string
  clientName?: string
}

/** The structured 409 payload returned when a login matches several laundries. */
export interface LoginChoice {
  code: string
  message: string
  laundries: LaundryChoice[]
}

/** Read the structured 409 without turning it into a generic request error. */
export function laundryChoices(error: unknown): LoginChoice | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) return null
  const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail
  if (!detail || typeof detail !== 'object') return null
  const value = detail as Partial<LoginChoice>
  if (value.code !== 'laundry_required') return null
  const rawLaundries: unknown[] = Array.isArray(value.laundries) ? value.laundries : []
  const laundries = rawLaundries
    .map((item: unknown) => {
      const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
      return {
        id: String(row.laundry_id ?? row.id ?? ''),
        name: String(row.laundry_name ?? row.name ?? ''),
        clientType: row.client_type ? String(row.client_type) : undefined,
        clientName: row.client_name ? String(row.client_name) : undefined,
      }
    })
    .filter((item: LaundryChoice) => item.id)
  return {
    code: 'laundry_required',
    message:
      typeof value.message === 'string' && value.message.trim()
        ? value.message
        : 'This login matches more than one laundry. Choose one to continue.',
    laundries,
  }
}

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    const choice = laundryChoices(error)
    if (choice) return choice.message
    if (detail && typeof detail === 'object') {
      const message = (detail as { message?: unknown }).message
      if (typeof message === 'string' && message.trim()) return message
    }
    if (error.code === 'ECONNABORTED') return 'The server took too long to respond. Try again.'
    if (!error.response) return 'Cannot reach the server. Check your connection.'
  }
  return 'Something went wrong. Try again.'
}
`,

    'src/config/app.ts': `export interface NavItem {
  path: string
  label: string
  /** The real endpoint this screen will consume. */
  endpoint: string
  blurb: string
}

export const appConfig = {
  title: '${app.title}',
  tagline: '${app.tagline}',
  authKind: '${app.authKind}' as 'staff' | 'client',
  /** ${loginPath} — the only sign-in this app may call. */
  loginPath: '${loginPath}',
  statusPath: '${statusPath}',
  nav: ${JSON.stringify(app.nav, null, 2).replace(/\n/g, '\n  ')} as NavItem[],
}
`,

    'src/auth/AuthContext.tsx': `import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../api/client'
import { appConfig } from '../config/app'
import {
  clearSession,
  isExpired,
  readSession,
  writeSession,
  type Session,
  type SessionUser,
} from '../session'

interface SignInInput {
  username: string
  password: string
  /** Set only after an ambiguous client login asks us to pick a tenant. */
  laundryId?: string
}

interface AuthValue {
  session: Session | null
  user: SessionUser | null
  isAuthenticated: boolean
  signIn: (input: SignInInput) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

/** Shape a staff \`/auth/login\` response. */
function staffUser(user: Record<string, unknown>): SessionUser {
  return {
    name: String(user.user_name ?? user.auth_id ?? 'Staff'),
    role: String(user.role_id ?? user.role ?? '').toUpperCase(),
    laundry: user.laundry_id ? String(user.laundry_id) : undefined,
  }
}

/** Shape a hotel \`/client/auth/login\` response. */
function clientUser(client: Record<string, unknown>): SessionUser {
  return {
    name: String(client.user_name ?? client.auth_id ?? 'Hotel'),
    role: String(client.role_id ?? '').toUpperCase(),
    laundry: client.laundry_id ? String(client.laundry_id) : undefined,
    clientName: client.client_name ? String(client.client_name) : undefined,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const stored = readSession()
    if (stored && isExpired(stored.token)) {
      clearSession()
      return null
    }
    return stored
  })

  const signOut = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  const signIn = useCallback(async ({ username, password, laundryId }: SignInInput) => {
    const isClient = appConfig.authKind === 'client'
    // Staff sign in with username; hotel/shop clients sign in with auth_id.
    // A client tenant is only sent when the server asked us to disambiguate.
    const body = isClient
      ? {
          auth_id: username.trim(),
          password,
          ...(laundryId ? { laundry_id: laundryId } : {}),
        }
      : { username: username.trim(), password }

    const { data } = await authApi.post(appConfig.loginPath, body)
    const user = isClient
      ? clientUser(data.client as Record<string, unknown>)
      : staffUser(data.user as Record<string, unknown>)

    // A hotel session must never be stored without knowing which hotel it is:
    // every query is filtered by that name, so an empty one would silently
    // return nothing (or, worse, be trusted as a wildcard by a future endpoint).
    if (isClient && !user.clientName) {
      throw new Error('This account is not linked to a hotel. Contact your provider.')
    }

    const next: Session = { token: String(data.access_token), user }
    writeSession(next)
    setSession(next)
  }, [])

  // Confirm the stored session is still valid server-side. A 401 clears it via
  // the interceptor; a 403 (suspended account) must also end the session.
  useEffect(() => {
    if (!session) return
    let cancelled = false
    authApi
      .get(appConfig.statusPath)
      .catch((error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (!cancelled && (status === 401 || status === 403)) signOut()
      })
    return () => {
      cancelled = true
    }
    // Run once per token, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token])

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
      signIn,
      signOut,
    }),
    [session, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
`,

    'src/auth/LoginPage.tsx': `import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { errorMessage, laundryChoices, type LoginChoice } from '../api/client'
import { appConfig } from '../config/app'
import { useAuth } from './AuthContext'

export function LoginPage() {
  const { isAuthenticated, signIn } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [choice, setChoice] = useState<LoginChoice | null>(null)
  const [laundryId, setLaundryId] = useState('')

  if (isAuthenticated) return <Navigate to="/" replace />

  const isClient = appConfig.authKind === 'client'

  async function submit(selectedLaundry?: string) {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      await signIn({ username, password, laundryId: selectedLaundry })
      setChoice(null)
    } catch (caught) {
      const options = laundryChoices(caught)
      if (options && options.laundries.length > 0) {
        setChoice(options)
        setLaundryId(options.laundries[0].id)
        setError(null)
        return
      }
      setChoice(null)
      setError(caught instanceof Error && caught.message ? caught.message : errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!choice) void submit()
  }

  return (
    <main className="login-shell">
      <div className="login-shell__glow" aria-hidden="true" />
      <section className="login-card">
        <div className="login-card__header">
          <span className="login-mark" aria-hidden="true">LL</span>
          <p className="eyebrow">Love Laundry · secure access</p>
          <h1>{appConfig.title}</h1>
          <p className="muted">{appConfig.tagline}</p>
        </div>

        <form onSubmit={handleSubmit} className="form-stack">
          <label className="field">
            <span className="field__label">{isClient ? 'Hotel login ID' : 'Username'}</span>
            <input
              className="field__input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              placeholder={isClient ? 'e.g. hotel-001' : 'Your username'}
              required
            />
          </label>

          <label className="field">
            <span className="field__label">Password</span>
            <input
              className="field__input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </label>

          {error ? <p role="alert" className="alert alert--error">{error}</p> : null}

          {choice ? (
            <div className="laundry-choice" role="alert">
              <p className="laundry-choice__message">{choice.message}</p>
              <label className="field">
                <span className="field__label">Laundry</span>
                <select
                  className="field__input"
                  value={laundryId}
                  onChange={(event) => setLaundryId(event.target.value)}
                >
                  {choice.laundries.map((item) => (
                    <option key={item.id} value={item.id}>{item.name || item.id}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn btn--primary btn--block"
                disabled={pending || !laundryId}
                onClick={() => void submit(laundryId)}
              >
                {pending ? 'Signing in…' : 'Continue with selected laundry'}
              </button>
            </div>
          ) : (
            <button type="submit" className="btn btn--primary btn--block" disabled={pending}>
              {pending ? 'Signing in…' : 'Sign in'}
            </button>
          )}
        </form>

        <p className="login-card__footer">
          Access is limited to accounts registered for this workspace.
        </p>
      </section>
    </main>
  )
}
`,

    'src/shell/AppShell.tsx': `import { NavLink, Outlet } from 'react-router-dom'
import clsx from 'clsx'
import { useAuth } from '../auth/AuthContext'
import { appConfig } from '../config/app'

export function AppShell() {
  const { user, signOut } = useAuth()
  const scope = user?.clientName ?? user?.laundry

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-brand">
            <span className="app-brand__mark" aria-hidden="true">LL</span>
            <div className="app-brand__copy">
              <p className="app-brand__title">{appConfig.title}</p>
              <p className="app-brand__tagline">{appConfig.tagline}</p>
            </div>
          </div>

          <div className="app-header__actions">
            {scope ? <span className="badge badge--brand">{scope}</span> : null}
            <div className="user-chip">
              <span className="user-chip__avatar" aria-hidden="true">
                {(user?.name ?? 'U').slice(0, 1).toUpperCase()}
              </span>
              <span className="user-chip__copy">
                <span className="user-chip__name">{user?.name}</span>
                <span className="user-chip__role">{user?.role || 'Member'}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="icon-button"
              aria-label="Sign out"
              title="Sign out"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </button>
          </div>
        </div>

        <nav className="app-nav" aria-label="Primary">
          <div className="app-nav__inner">
            {appConfig.nav.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  clsx('app-nav__link', isActive && 'app-nav__link--active')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">Love Laundry · {appConfig.title}</footer>
    </div>
  )
}
`,

    'src/pages/SectionPage.tsx': `import { Link, useLocation, useNavigate } from 'react-router-dom'
import { appConfig, type NavItem } from '../config/app'

export function SectionPage({ item }: { item: NavItem }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const current = appConfig.nav.find((route) => route.path === pathname) ?? item
  const isCurrent = current.path === pathname

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <section className="page">
      <div className="hero-band">
        <div className="hero-band__grid" aria-hidden="true" />
        <div className="hero-band__content">
          <span className="hero-band__icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 4 7v6c0 4.5 3.2 7.4 8 8 4.8-.6 8-3.5 8-8V7l-8-4Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>
          <div>
            <p className="eyebrow eyebrow--light"> love laundry workspace </p>
            <h1>{current.label}</h1>
            <p>{current.blurb}</p>
          </div>
        </div>
      </div>

      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">{appConfig.title}</p>
          <h2 className="page-header__title">{current.label}</h2>
          <p className="page-header__subtitle">
            This screen is wired to the existing service contract. Data appears
            here as soon as the endpoint is connected.
          </p>
        </div>
        <div className="page-header__actions">
          <span className={isCurrent ? 'badge badge--success' : 'badge badge--soft'}>
            {isCurrent ? 'Current page' : 'Available route'}
          </span>
          <button type="button" className="btn btn--ghost" onClick={goBack}>Back</button>
        </div>
      </header>

      <div className="stat-grid">
        <article className="stat-card">
          <p className="stat-card__label">Workspace</p>
          <p className="stat-card__value">{appConfig.title}</p>
          <p className="stat-card__foot">Signed-in area</p>
        </article>
        <article className="stat-card">
          <p className="stat-card__label">Routes</p>
          <p className="stat-card__value">{appConfig.nav.length}</p>
          <p className="stat-card__foot">Available in this app</p>
        </article>
        <article className="stat-card">
          <p className="stat-card__label">Account type</p>
          <p className="stat-card__value">
            {appConfig.authKind === 'client' ? 'Client' : 'Staff'}
          </p>
          <p className="stat-card__foot">Set by the sign-in service</p>
        </article>
      </div>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Navigation</p>
            <h3>Application routes</h3>
          </div>
          <span className="code-chip">{pathname}</span>
        </div>
        <ul className="route-grid">
          {appConfig.nav.map((route) => (
            <li key={route.path}>
              <Link
                to={route.path}
                aria-current={route.path === pathname ? 'page' : undefined}
                className={route.path === pathname ? 'route-card route-card--active' : 'route-card'}
              >
                <span className="route-card__path">{route.path}</span>
                <span className="route-card__title">{route.label}</span>
                <span className="route-card__blurb">{route.blurb}</span>
                <span className="route-card__endpoint">{route.endpoint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="notice">
        Tenant scope always comes from the signed-in token. No screen here accepts
        a laundry or hotel ID from the URL.
      </p>
    </section>
  )
}
`,

    'src/App.tsx': `import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { LoginPage } from './auth/LoginPage'
import { AppShell } from './shell/AppShell'
import { SectionPage } from './pages/SectionPage'
import { appConfig } from './config/app'

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function Router() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        {appConfig.nav.map((item) => (
          <Route key={item.path} path={item.path} element={<SectionPage item={item} />} />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </BrowserRouter>
  )
}
`,

    'src/main.tsx': `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element missing from index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`,

    'src/index.css': `@import 'tailwindcss';

:root {
  --brand: ${app.accent};
  --brand-soft: color-mix(in srgb, var(--brand) 10%, white);
  --brand-ring: color-mix(in srgb, var(--brand) 24%, transparent);
  --ink: #0f172a;
  --ink-soft: #475569;
  --ink-muted: #64748b;
  --line: #e2e8f0;
  --surface: #ffffff;
  --canvas: #f6f8fc;
  --success: #047857;
  --success-soft: #ecfdf5;
  --danger: #b91c1c;
  --danger-soft: #fef2f2;
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.05);
  --shadow-md: 0 18px 45px -25px rgba(15, 23, 42, 0.32);
  color: var(--ink);
  background: var(--canvas);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
}

* { box-sizing: border-box; }
html, body, #root { min-height: 100%; }
body { margin: 0; background: var(--canvas); -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
button, input, select, textarea { font: inherit; }
button { cursor: pointer; }
a { color: inherit; text-decoration: none; }
h1, h2, h3, p { margin-top: 0; }

.eyebrow {
  margin: 0 0 .35rem;
  color: var(--brand);
  font-size: .7rem;
  font-weight: 700;
  letter-spacing: .14em;
  text-transform: uppercase;
}
.eyebrow--light { color: rgba(255, 255, 255, .78); }
.muted { color: var(--ink-muted); font-size: .9rem; line-height: 1.55; }

.badge {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  padding: .25rem .65rem;
  color: var(--ink-soft);
  font-size: .72rem;
  font-weight: 600;
  white-space: nowrap;
}
.badge--brand { border-color: transparent; background: var(--brand-soft); color: var(--brand); }
.badge--soft { background: #f8fafc; }
.badge--success { border-color: #a7f3d0; background: var(--success-soft); color: var(--success); }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .45rem;
  border: 1px solid transparent;
  border-radius: .7rem;
  padding: .65rem 1rem;
  font-size: .875rem;
  font-weight: 650;
  transition: transform .15s ease, background .15s ease, border-color .15s ease, box-shadow .15s ease;
}
.btn:hover:not(:disabled) { transform: translateY(-1px); }
.btn:disabled { cursor: not-allowed; opacity: .6; }
.btn--primary { background: var(--brand); color: #fff; box-shadow: 0 8px 20px -10px var(--brand); }
.btn--primary:hover:not(:disabled) { background: color-mix(in srgb, var(--brand) 85%, #0f172a); }
.btn--ghost { border-color: var(--line); background: #fff; color: var(--ink-soft); }
.btn--ghost:hover:not(:disabled) { border-color: var(--brand); color: var(--brand); }
.btn--block { width: 100%; }

.field { display: grid; gap: .4rem; }
.field__label { color: var(--ink-soft); font-size: .78rem; font-weight: 650; }
.field__input {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: .7rem;
  background: #fff;
  padding: .7rem .85rem;
  color: var(--ink);
  font-size: .9rem;
  outline: none;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.field__input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px var(--brand-ring); }
.form-stack { display: grid; gap: 1rem; }

.alert { border-radius: .7rem; padding: .7rem .85rem; font-size: .85rem; line-height: 1.45; }
.alert--error { border: 1px solid #fecaca; background: var(--danger-soft); color: var(--danger); }
.notice { border: 1px dashed var(--line); border-radius: .85rem; background: #fbfcfe; padding: .85rem 1rem; color: var(--ink-muted); font-size: .8rem; line-height: 1.5; }

/* Sign-in */
.login-shell {
  position: relative;
  display: grid;
  min-height: 100dvh;
  place-items: center;
  overflow: hidden;
  padding: 2rem 1rem;
  background: radial-gradient(circle at 12% 10%, var(--brand-soft), transparent 32%),
              linear-gradient(160deg, #f8fafc 0%, #eef2f9 100%);
}
.login-shell__glow {
  position: absolute;
  right: -12%;
  bottom: -35%;
  height: 34rem;
  width: 34rem;
  border-radius: 999px;
  background: radial-gradient(circle, var(--brand-ring), transparent 68%);
  pointer-events: none;
}
.login-card {
  position: relative;
  width: min(100%, 27rem);
  border: 1px solid var(--line);
  border-radius: 1.25rem;
  background: rgba(255, 255, 255, .97);
  padding: 2rem;
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(10px);
}
.login-card__header { margin-bottom: 1.75rem; text-align: center; }
.login-card__header h1 { margin: .35rem 0 .3rem; font-size: 1.6rem; letter-spacing: -.025em; }
.login-mark {
  display: inline-grid;
  height: 2.75rem;
  width: 2.75rem;
  place-items: center;
  border-radius: .9rem;
  background: var(--brand);
  color: #fff;
  font-size: .85rem;
  font-weight: 800;
  letter-spacing: .05em;
  box-shadow: 0 10px 24px -12px var(--brand);
}
.login-card__footer { margin: 1.25rem 0 0; color: var(--ink-muted); font-size: .75rem; line-height: 1.5; text-align: center; }
.laundry-choice { display: grid; gap: .8rem; border: 1px solid #fcd34d; border-radius: .85rem; background: #fffbeb; padding: 1rem; }
.laundry-choice__message { margin: 0; color: #92400e; font-size: .85rem; line-height: 1.45; }

/* App chrome */
.app-shell { display: flex; min-height: 100dvh; flex-direction: column; }
.app-header { position: sticky; top: 0; z-index: 10; border-bottom: 1px solid var(--line); background: rgba(255, 255, 255, .93); backdrop-filter: blur(12px); }
.app-header__inner { display: flex; max-width: 76rem; align-items: center; justify-content: space-between; gap: 1.25rem; margin: 0 auto; padding: .9rem 1.25rem; }
.app-brand { display: flex; min-width: 0; align-items: center; gap: .75rem; }
.app-brand__mark { display: grid; height: 2.5rem; width: 2.5rem; flex: 0 0 auto; place-items: center; border-radius: .8rem; background: var(--brand); color: #fff; font-size: .8rem; font-weight: 800; }
.app-brand__copy { min-width: 0; }
.app-brand__title { margin: 0; font-size: .98rem; font-weight: 700; }
.app-brand__tagline { margin: .1rem 0 0; color: var(--ink-muted); font-size: .75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-header__actions { display: flex; align-items: center; gap: .75rem; }
.user-chip { display: flex; align-items: center; gap: .55rem; }
.user-chip__avatar { display: grid; height: 2rem; width: 2rem; place-items: center; border-radius: 999px; background: var(--brand-soft); color: var(--brand); font-size: .8rem; font-weight: 700; }
.user-chip__copy { display: grid; line-height: 1.15; }
.user-chip__name { font-size: .8rem; font-weight: 650; }
.user-chip__role { color: var(--ink-muted); font-size: .68rem; letter-spacing: .04em; text-transform: uppercase; }
.icon-button { display: grid; height: 2.25rem; width: 2.25rem; place-items: center; border: 1px solid var(--line); border-radius: .7rem; background: #fff; color: var(--ink-soft); }
.icon-button:hover { border-color: var(--brand); color: var(--brand); }
.app-nav { border-top: 1px solid #f1f5f9; }
.app-nav__inner { display: flex; max-width: 76rem; gap: .25rem; overflow-x: auto; margin: 0 auto; padding: .5rem 1.25rem; }
.app-nav__link { flex: 0 0 auto; border-radius: .65rem; padding: .45rem .8rem; color: var(--ink-soft); font-size: .82rem; font-weight: 600; }
.app-nav__link:hover { background: var(--brand-soft); color: var(--brand); }
.app-nav__link--active, .app-nav__link--active:hover { background: var(--brand); color: #fff; }
.app-main { width: 100%; max-width: 76rem; flex: 1; margin: 0 auto; padding: 1.5rem 1.25rem 2.5rem; }
.app-footer { border-top: 1px solid var(--line); padding: 1rem 1.25rem; color: var(--ink-muted); font-size: .72rem; text-align: center; }

/* Pages */
.page { display: grid; gap: 1.25rem; }
.hero-band { position: relative; overflow: hidden; border-radius: 1.1rem; background: linear-gradient(135deg, color-mix(in srgb, var(--brand) 92%, #0f172a), color-mix(in srgb, var(--brand) 62%, #0f172a)); padding: 1.5rem 1.6rem; color: #fff; box-shadow: var(--shadow-md); }
.hero-band__grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255, 255, 255, .08) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, .08) 1px, transparent 1px); background-size: 26px 26px; mask-image: linear-gradient(to right, #000, transparent 85%); }
.hero-band__content { position: relative; display: flex; align-items: center; gap: 1rem; }
.hero-band__icon { display: grid; height: 3rem; width: 3rem; flex: 0 0 auto; place-items: center; border: 1px solid rgba(255, 255, 255, .28); border-radius: .9rem; background: rgba(255, 255, 255, .14); }
.hero-band h1 { margin: 0 0 .3rem; font-size: 1.45rem; letter-spacing: -.02em; }
.hero-band p:last-child { margin: 0; color: rgba(255, 255, 255, .82); font-size: .88rem; }
.page-header { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.page-header__eyebrow { margin: 0 0 .25rem; color: var(--brand); font-size: .7rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.page-header__title { margin: 0; font-size: 1.25rem; letter-spacing: -.015em; }
.page-header__subtitle { max-width: 44rem; margin: .4rem 0 0; color: var(--ink-muted); font-size: .87rem; line-height: 1.55; }
.page-header__actions { display: flex; align-items: center; gap: .5rem; }
.stat-grid { display: grid; gap: .9rem; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
.stat-card { border: 1px solid var(--line); border-radius: 1rem; background: var(--surface); padding: 1.1rem; box-shadow: var(--shadow-sm); }
.stat-card__label { margin: 0 0 .5rem; color: var(--ink-muted); font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.stat-card__value { margin: 0 0 .35rem; overflow: hidden; font-size: 1.2rem; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.stat-card__foot { margin: 0; color: var(--ink-muted); font-size: .76rem; }
.panel { border: 1px solid var(--line); border-radius: 1rem; background: var(--surface); box-shadow: var(--shadow-sm); }
.panel__header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .75rem; border-bottom: 1px solid var(--line); padding: 1rem 1.15rem; }
.panel__header h3 { margin: 0; font-size: 1rem; }
.code-chip { border: 1px solid var(--line); border-radius: .5rem; background: #f8fafc; padding: .25rem .55rem; color: var(--ink-muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .74rem; }
.route-grid { display: grid; gap: .8rem; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); margin: 0; padding: 1.15rem; list-style: none; }
.route-card { display: grid; height: 100%; gap: .35rem; border: 1px solid var(--line); border-radius: .85rem; padding: .9rem; transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease; }
.route-card:hover { transform: translateY(-2px); border-color: var(--brand); box-shadow: var(--shadow-sm); }
.route-card--active { border-color: var(--brand); background: var(--brand-soft); }
.route-card__path { color: var(--brand); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .7rem; font-weight: 700; }
.route-card__title { font-size: .92rem; font-weight: 700; }
.route-card__blurb { color: var(--ink-soft); font-size: .78rem; line-height: 1.45; }
.route-card__endpoint { color: var(--ink-muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .68rem; word-break: break-all; }

@media (max-width: 640px) {
  .app-header__inner { align-items: flex-start; }
  .app-brand__tagline { display: none; }
  .user-chip__copy { display: none; }
  .login-card { padding: 1.5rem; }
}
`,
  }
}

for (const app of apps) {
  const root = join(target, app.dir)
  const entries = Object.entries(files(app))

  for (const [relative, content] of entries) {
    const file = join(root, relative)
    await mkdir(join(file, '..'), { recursive: true })
    await writeFile(file, content, 'utf8')
  }

  console.log(`${app.dir}: ${entries.length} files`)
}
