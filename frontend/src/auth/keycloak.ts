import Keycloak from 'keycloak-js'

// Single shared Keycloak instance for the whole app.
// KEYCLOAK_URL and KEYCLOAK_REALM can be overridden via env vars at build time.
const keycloak = new Keycloak({
  url:    import.meta.env.VITE_KEYCLOAK_URL   ?? 'http://localhost:8180',
  realm:  import.meta.env.VITE_KEYCLOAK_REALM ?? 'visiontrack',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'visiontrack-app',
})

export default keycloak
