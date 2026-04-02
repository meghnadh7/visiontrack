import axios from 'axios'

const REDMINE_URL     = process.env.REDMINE_URL     ?? 'http://localhost:8080'
const REDMINE_API_KEY = process.env.REDMINE_API_KEY ?? ''
const ROBOFLOW_KEY    = process.env.ROBOFLOW_API_KEY ?? ''
const ROBOFLOW_WS     = process.env.ROBOFLOW_WORKSPACE ?? ''

export interface ProvisionPayload {
  sub: string
  username: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
}

/** Map Keycloak roles to a Redmine role id.
 *  admin=3 (Manager), developer=4 (Developer), reporter=5 (Reporter) in a default Redmine install.
 *  Adjust if your Redmine seeded different ids.
 */
function redmineRoleId(roles: string[]): number {
  if (roles.includes('admin')) return 3
  if (roles.includes('developer')) return 4
  return 5
}

/**
 * Creates a Redmine user account for a newly-logged-in Keycloak user.
 * Safe to call multiple times — returns the existing user id if the login
 * already exists.
 */
export async function provisionRedmineUser(p: ProvisionPayload): Promise<number | null> {
  try {
    // Check if user already exists by login
    const search = await axios.get(`${REDMINE_URL}/users.json`, {
      headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
      params: { name: p.username },
    })
    const users: Array<{ id: number; login: string }> = search.data?.users ?? []
    const existing = users.find((u) => u.login === p.username)
    if (existing) return existing.id

    // Create new user
    const res = await axios.post(
      `${REDMINE_URL}/users.json`,
      {
        user: {
          login: p.username,
          firstname: p.firstName || p.username,
          lastname: p.lastName || p.username,
          mail: p.email,
          password: crypto.randomUUID(), // random password — they log in via Keycloak
          must_change_passwd: false,
          auth_source_id: null,
          role_ids: [redmineRoleId(p.roles)],
        },
      },
      { headers: { 'X-Redmine-API-Key': REDMINE_API_KEY } },
    )
    return res.data?.user?.id ?? null
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[provision] Redmine user creation failed:', msg)
    return null
  }
}

/**
 * Sends a Roboflow workspace invite for the new user.
 * Roboflow doesn't have a direct "create user" endpoint — inviting by email
 * is the standard way to add members.
 */
export async function provisionRoboflowUser(p: ProvisionPayload): Promise<boolean> {
  if (!ROBOFLOW_WS || !ROBOFLOW_KEY) return false
  try {
    await axios.post(
      `https://api.roboflow.com/${ROBOFLOW_WS}/invite`,
      { email: p.email, role: p.roles.includes('admin') ? 'admin' : 'developer' },
      { params: { api_key: ROBOFLOW_KEY } },
    )
    return true
  } catch (err: unknown) {
    // Roboflow returns 4xx when user is already a member — treat as success
    const status = (err as { response?: { status: number } }).response?.status
    if (status === 409 || status === 422) return true
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[provision] Roboflow invite failed:', msg)
    return false
  }
}
