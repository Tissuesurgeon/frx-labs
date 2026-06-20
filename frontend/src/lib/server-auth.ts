import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export function requireAuthToken(): string {
  const token = cookies().get('frx_token')?.value;
  if (!token) redirect('/login');
  return token;
}

export async function withAuth<T>(fn: () => Promise<T>): Promise<T> {
  requireAuthToken();
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message.toLowerCase() : '';
    if (msg.includes('unauthorized') || msg.includes('invalid token') || msg.includes('401')) {
      redirect('/login');
    }
    throw e;
  }
}
