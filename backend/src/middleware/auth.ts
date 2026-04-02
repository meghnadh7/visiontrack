import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

const KEYCLOAK_URL   = process.env.KEYCLOAK_URL   ?? 'http://localhost:8180'
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM ?? 'visiontrack'

const jwks = jwksClient({
  jwksUri: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  cache: true,
  cacheMaxAge: 600_000,  // 10 minutes
})

function getKey(header: jwt.JwtHeader, cb: jwt.SigningKeyCallback) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err || !key) return cb(err ?? new Error('Signing key not found'))
    cb(null, key.getPublicKey())
  })
}

export interface AuthRequest extends Request {
  user?: {
    sub: string
    preferred_username?: string
    email?: string
    name?: string
    realm_access?: { roles: string[] }
  }
}

/**
 * Verifies the Bearer JWT from Keycloak.
 * In development (NODE_ENV !== 'production') and when Keycloak is unreachable
 * the middleware falls back to skipping verification so the app still works
 * without Keycloak running locally.
 */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    // Dev bypass — no token present and not in production
    if (process.env.NODE_ENV !== 'production') return next()
    return res.status(401).json({ error: 'Missing Bearer token' })
  }

  const token = authHeader.slice(7)

  jwt.verify(
    token,
    getKey,
    {
      algorithms: ['RS256'],
      issuer: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
    },
    (err, decoded) => {
      if (err) {
        // In dev, log but let through so local testing without Keycloak still works
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[auth] JWT verification failed (dev mode — passing through):', err.message)
          return next()
        }
        return res.status(401).json({ error: 'Invalid or expired token' })
      }
      req.user = decoded as AuthRequest['user']
      next()
    },
  )
}
