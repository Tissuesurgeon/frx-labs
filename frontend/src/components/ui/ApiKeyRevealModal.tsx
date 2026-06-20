'use client';

interface ApiKeyRevealModalProps {
  apiKey: string;
  onClose: () => void;
}

export function ApiKeyRevealModal({ apiKey, onClose }: ApiKeyRevealModalProps) {
  async function copy() {
    await navigator.clipboard.writeText(apiKey);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg border border-border bg-surface p-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-warning">
          One-time reveal
        </p>
        <h2 className="mt-2 font-mono text-xl font-bold">Save your API key</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This key is shown only once. Store it securely — agents use it for{' '}
          <code className="text-xs">POST /api/v1/execute</code> only.
        </p>
        <div className="mt-4 rounded-md border border-border bg-background p-4">
          <code className="break-all font-mono text-sm">{apiKey}</code>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={copy} className="btn btn-primary">
            Copy Key
          </button>
          <button type="button" onClick={onClose} className="btn">
            I saved it
          </button>
        </div>
      </div>
    </div>
  );
}
