import { SignJWT, jwtVerify } from 'jose'

function getSignatureSecret() {
  const secret = process.env.SIGNATURE_SECRET
  if (!secret) throw new Error('SIGNATURE_SECRET environment variable is required')
  return new TextEncoder().encode(secret)
}

interface SignatureTokenPayload {
  requestId: string
}

export async function createSignatureToken(requestId: string): Promise<string> {
  return new SignJWT({ requestId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSignatureSecret())
}

export async function verifySignatureToken(token: string): Promise<SignatureTokenPayload> {
  const { payload } = await jwtVerify(token, getSignatureSecret())
  return { requestId: payload.requestId as string }
}
