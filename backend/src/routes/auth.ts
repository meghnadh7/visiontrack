import { Router, Response } from 'express'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { provisionRedmineUser, provisionRoboflowUser } from '../services/provision.service'

const router = Router()

/**
 * POST /api/auth/provision
 *
 * Called by the frontend after the first successful Keycloak login.
 * Creates matching accounts in Redmine and sends a Roboflow invite so the
 * user can interact with both systems using their Keycloak identity.
 *
 * The request body is filled from keycloak.tokenParsed on the frontend:
 * { sub, preferred_username, email, given_name, family_name, realm_access }
 */
router.post('/provision', requireAuth, async (req: AuthRequest, res: Response) => {
  const body = req.body as {
    sub?: string
    preferred_username?: string
    email?: string
    given_name?: string
    family_name?: string
    realm_access?: { roles?: string[] }
  }

  const payload = {
    sub:       body.sub ?? req.user?.sub ?? '',
    username:  body.preferred_username ?? req.user?.preferred_username ?? body.email ?? '',
    email:     body.email ?? req.user?.email ?? '',
    firstName: body.given_name ?? '',
    lastName:  body.family_name ?? '',
    roles:     body.realm_access?.roles ?? req.user?.realm_access?.roles ?? [],
  }

  if (!payload.username || !payload.email) {
    return res.status(400).json({ error: 'username and email are required' })
  }

  const [redmineId, roboflowOk] = await Promise.all([
    provisionRedmineUser(payload),
    provisionRoboflowUser(payload),
  ])

  res.json({
    provisioned: true,
    redmineUserId: redmineId,
    roboflowInviteSent: roboflowOk,
  })
})

export default router
