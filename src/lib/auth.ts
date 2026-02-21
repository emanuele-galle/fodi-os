import { SignJWT, jwtVerify } from 'jose'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import type { Role } from '@/generated/prisma/client'

export interface SessionPayload {
  sub: string
  email: string
  name: string
  role: Role
  customRoleId?: string | null
  type: 'access' | 'refresh'
}

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const REFRESH_SECRET = new TextEncoder().encode(process.env.REFRESH_SECRET!)

const ACCESS_EXPIRES = '30m'
const REFRESH_EXPIRES = '7d'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createAccessToken(payload: Omit<SessionPayload, 'type'>): Promise<string> {
  return new SignJWT({ ...payload, type: 'access' as const })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_EXPIRES)
    .sign(ACCESS_SECRET)
}

export async function createRefreshToken(payload: Omit<SessionPayload, 'type'>): Promise<string> {
  return new SignJWT({ ...payload, type: 'refresh' as const })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRES)
    .sign(REFRESH_SECRET)
}

export async function verifyAccessToken(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET)
  return payload as unknown as SessionPayload
}

export async function verifyRefreshToken(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, REFRESH_SECRET)
  return payload as unknown as SessionPayload
}

export async function setAuthCookies(accessToken: string, refreshToken: string): Promise<void> {
  const cookieStore = await cookies()

  cookieStore.set('fodi_access', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 60, // 30 minutes
  })

  cookieStore.set('fodi_refresh', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('fodi_access')
  cookieStore.delete('fodi_refresh')
}

export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('fodi_access')?.value
  if (!token) return null

  try {
    return await verifyAccessToken(token)
  } catch {
    return null
  }
}
