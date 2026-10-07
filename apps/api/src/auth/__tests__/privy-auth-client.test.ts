import { exportSPKI, generateKeyPair, SignJWT } from 'jose'
import { beforeAll, describe, expect, it } from 'vitest'
import { createPrivyAuthClient } from '../privy-auth-client'

// Runs the REAL Privy SDK verification, offline: tokens are signed with a
// locally generated ES256 key that's handed to the client as its verification
// key. This pins how the SDK reports expired vs invalid, which the adapter
// depends on.

type PrivateKey = Awaited<ReturnType<typeof generateKeyPair>>['privateKey']

const APP_ID = 'test-app-id'
let privateKey: PrivateKey
let otherPrivateKey: PrivateKey
let verificationKey: string

async function sign(
  key: PrivateKey,
  { expiresIn = '1h', audience = APP_ID }: { expiresIn?: string | number; audience?: string } = {},
) {
  return new SignJWT({ sid: 'session-1' })
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
    .setIssuer('privy.io')
    .setAudience(audience)
    .setSubject('did:privy:alice')
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key)
}

beforeAll(async () => {
  const pair = await generateKeyPair('ES256', { extractable: true })
  privateKey = pair.privateKey
  verificationKey = await exportSPKI(pair.publicKey)
  otherPrivateKey = (await generateKeyPair('ES256')).privateKey
})

function client() {
  return createPrivyAuthClient({ appId: APP_ID, appSecret: 'unused', verificationKey })
}

describe('createPrivyAuthClient.verifyToken', () => {
  it('accepts a correctly signed token and returns the subject', async () => {
    expect(await client().verifyToken(await sign(privateKey))).toEqual({
      ok: true,
      privyUserId: 'did:privy:alice',
    })
  })

  it('reports an expired token as expired, not invalid', async () => {
    const token = await sign(privateKey, { expiresIn: Math.floor(Date.now() / 1000) - 60 })
    expect(await client().verifyToken(token)).toEqual({ ok: false, reason: 'expired_token' })
  })

  it('rejects a token signed by another key', async () => {
    expect(await client().verifyToken(await sign(otherPrivateKey))).toEqual({
      ok: false,
      reason: 'invalid_token',
    })
  })

  it('rejects a token for another app', async () => {
    const token = await sign(privateKey, { audience: 'someone-elses-app' })
    expect(await client().verifyToken(token)).toEqual({ ok: false, reason: 'invalid_token' })
  })

  it('rejects garbage', async () => {
    expect(await client().verifyToken('not-a-jwt')).toEqual({ ok: false, reason: 'invalid_token' })
  })
})
