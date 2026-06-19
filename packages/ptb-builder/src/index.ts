export interface BuildSwapPtbRequest {
  asset_in?: string;
  asset_out?: string;
  amount?: number;
  pool_key?: string;
}

export interface PtbDraft {
  network: string;
  type: string;
  pool_key: string;
  ptb: string;
}

export async function buildDeepBookSwapPtb(
  baseUrl: string,
  req: BuildSwapPtbRequest,
): Promise<PtbDraft> {
  const res = await fetch(`${baseUrl}/ptb/deepbook-swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error('PTB build failed');
  return res.json() as Promise<PtbDraft>;
}
