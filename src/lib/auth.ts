import { cookies } from 'next/headers';
import { prisma } from './db';

const SESSION_COOKIE = 'sc_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionData {
  userId: number;
  userName: string;
  userEmail: string;
  role: 'ADMIN' | 'WRITER';
  avatarPath: string | null;
  token: string;
}

/** Generate a cryptographically random session token */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Create a session for the given user and write the cookie */
export async function createSession(userId: number): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  // Remove old sessions for this user.
  await prisma.session.deleteMany({ where: { userId } });

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Explicit opt-in only — a Secure cookie is silently dropped by the browser
    // over plain HTTP, which would break every login if this defaulted on NODE_ENV.
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return token;
}

/** Read the current session from the cookie + DB */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.active) {
    if (session) await prisma.session.delete({ where: { token } });
    return null;
  }

  return {
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
    role: session.user.role,
    avatarPath: session.user.avatarPath,
    token,
  };
}

/** Destroy the current session */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
    cookieStore.delete(SESSION_COOKIE);
  }
}
