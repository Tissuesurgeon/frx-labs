'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ConnectButton,
  useCurrentAccount,
  useSignPersonalMessage,
} from '@mysten/dapp-kit';
import { useAuth } from '@/components/auth/AuthProvider';
import { Logo } from '@/components/ui/Logo';
import { fetchChallenge, verifySignature } from '@/lib/auth';

function LoginForm() {
  const account = useCurrentAccount();
  const { mutateAsync: signMessage } = useSignPersonalMessage();
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/console';
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  async function handleSignIn() {
    if (!account?.address) return;
    setSigning(true);
    setError(null);
    try {
      const challenge = await fetchChallenge();
      const { signature } = await signMessage({
        message: new TextEncoder().encode(challenge.message),
      });
      const { token } = await verifySignature(
        account.address,
        signature,
        challenge.nonce,
      );
      await login(token);
      router.push(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setSigning(false);
    }
  }

  return (
    <>
      <div className="mt-8 flex flex-col gap-4">
        <ConnectButton className="!w-full" />
        {account && (
          <button
            type="button"
            onClick={handleSignIn}
            disabled={signing}
            className="landing-btn landing-btn-primary w-full disabled:opacity-50"
          >
            {signing ? 'Signing...' : 'SIGN_IN__❯'}
          </button>
        )}
        {error && (
          <p className="font-mono text-xs text-destructive">{error}</p>
        )}
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-border bg-surface/50 p-8">
        <Logo href="/" size="md" textClassName="text-sm" />
        <h1 className="mt-6 font-mono text-2xl font-bold">Sign in with Sui</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Connect your wallet and sign a message to access the FRX Labs console.
          Your wallet address becomes your on-chain owner identity.
        </p>

        <Suspense fallback={<p className="mt-8 text-sm text-muted-foreground">Loading...</p>}>
          <LoginForm />
        </Suspense>

        <p className="mt-8 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
          Capabilities, not ownership — agents receive scoped API keys after login.
        </p>
      </div>
    </div>
  );
}
