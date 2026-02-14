import { SignJWT, jwtVerify } from 'jose'

const SIGNATURE_SECRET = new TextEncoder().encode(
  process.env.SIGNATURE_SECRET || process.env.JWT_SECRET!
)

interface SignatureTokenPayload {
  requestId: string
}

export async function createSignatureToken(requestId: string): Promise<string> {
  return new SignJWT({ requestId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SIGNATURE_SECRET)
}

export async function verifySignatureToken(token: string): Promise<SignatureTokenPayload> {
  const { payload } = await jwtVerify(token, SIGNATURE_SECRET)
  return { requestId: payload.requestId as string }
}
