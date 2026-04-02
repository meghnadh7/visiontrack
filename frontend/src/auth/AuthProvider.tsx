import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import keycloak from './keycloak'
import client from '../api/client'

async function runProvision(token: string) {
  const p = keycloak.tokenParsed ?? {}
  try {
    await client.post(
      '/auth/provision',
      {
        sub:                p['sub'],
        preferred_username: p['preferred_username'],
        email:              p['email'],
        given_name:         p['given_name'],
        family_name:        p['family_name'],
        realm_access:       p['realm_access'],
      },
      { headers: { Authorization: `Bearer ${token}` } },
    )
  } catch {
    // Non-fatal — provision errors are logged server-side
  }
}

interface AuthState {
  ready: boolean          // keycloak.init() finished
  authenticated: boolean
  username: string | null
  email: string | null
  fullName: string | null
  roles: string[]
  token: string | null
  logout: () => void
}

const AuthContext = createContext<AuthState>({
  ready: false,
  authenticated: false,
  username: null,
  email: null,
  fullName: null,
  roles: [],
  token: null,
  logout: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

// Attach the current Keycloak token to every axios request.
// If the token is about to expire, Keycloak refreshes it first.
function setupAxiosInterceptor() {
  client.interceptors.request.use(async (config) => {
    if (keycloak.authenticated) {
      await keycloak.updateToken(30).catch(() => keycloak.login())
      config.headers['Authorization'] = `Bearer ${keycloak.token}`
    }
    return config
  })
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    ready: false,
    authenticated: false,
    username: null,
    email: null,
    fullName: null,
    roles: [],
    token: null,
    logout: () => keycloak.logout({ redirectUri: window.location.origin }),
  })

  useEffect(() => {
    setupAxiosInterceptor()

    keycloak
      .init({
        onLoad: 'login-required',   // redirect to Keycloak if not logged in
        pkceMethod: 'S256',
        checkLoginIframe: false,
      })
      .then((authenticated) => {
        if (!authenticated) return

        const p = keycloak.tokenParsed ?? {}
        const roles: string[] = keycloak.realmAccess?.roles ?? []
        const token = keycloak.token ?? null

        setState({
          ready: true,
          authenticated: true,
          username: (p['preferred_username'] as string) ?? null,
          email: (p['email'] as string) ?? null,
          fullName: (p['name'] as string) ?? null,
          roles,
          token,
          logout: () => keycloak.logout({ redirectUri: window.location.origin }),
        })

        // Fire-and-forget: create matching accounts in Redmine / Roboflow
        if (token) runProvision(token)
      })
      .catch(() => {
        // Keycloak unreachable — mark ready so the app can show an error
        setState((s) => ({ ...s, ready: true }))
      })
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
