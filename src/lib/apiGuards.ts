import { NextResponse } from 'next/server';
import { getSession, type SessionData } from './auth';

type GuardResult = { session: SessionData; error?: undefined } | { session?: undefined; error: NextResponse };

/** Require any signed-in user. Use: `const g = await requireUser(); if (g.error) return g.error;` */
export async function requireUser(): Promise<GuardResult> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { session };
}

/** Require a signed-in ADMIN. */
export async function requireAdmin(): Promise<GuardResult> {
  const result = await requireUser();
  if (result.error) return result;
  if (result.session.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return result;
}
