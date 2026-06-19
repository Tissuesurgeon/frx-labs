const TOKEN_KEY = 'frx_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY) ?? getCookie(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export async function fetchChallenge() {
  const res = await fetch(`${API_BASE}/api/v1/auth/challenge`);
  if (!res.ok) throw new Error('Failed to fetch auth challenge');
  return res.json() as Promise<{ nonce: string; message: string; expires_at: string }>;
}

export async function verifySignature(address: string, signature: string, nonce: string) {
  const res = await fetch(`${API_BASE}/api/v1/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature, nonce }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Verification failed' }));
    throw new Error((err as { error?: string }).error ?? 'Verification failed');
  }
  return res.json() as Promise<{ token: string; user: { id: string; sui_address: string } }>;
}
