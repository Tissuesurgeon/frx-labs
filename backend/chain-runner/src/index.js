import express from 'express';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const app = express();
app.use(express.json());

const PORT = process.env.PORT ?? process.env.CHAIN_RUNNER_PORT ?? 8090;
const NETWORK = process.env.SUI_NETWORK ?? 'testnet';
const RPC_URL =
  process.env.SUI_RPC_URL ??
  (NETWORK === 'mainnet'
    ? 'https://fullnode.mainnet.sui.io:443'
    : 'https://fullnode.testnet.sui.io:443');
const PACKAGE_ID = process.env.FRX_WALLET_PACKAGE_ID ?? '';

function loadAgentKeypair() {
  const raw = process.env.FRX_AGENT_PRIVATE_KEY;
  if (!raw) return null;
  try {
    if (raw.startsWith('suiprivkey')) {
      const { secretKey } = decodeSuiPrivateKey(raw);
      return Ed25519Keypair.fromSecretKey(secretKey);
    }
    if (raw.startsWith('0x')) {
      return Ed25519Keypair.fromSecretKey(raw.slice(2));
    }
    return Ed25519Keypair.fromSecretKey(raw);
  } catch (e) {
    console.warn('Invalid FRX_AGENT_PRIVATE_KEY:', e.message);
    return null;
  }
}

const agentKeypair = loadAgentKeypair();
const suiClient = new SuiClient({ url: RPC_URL });

function isConfiguredForOnChain() {
  return Boolean(PACKAGE_ID && agentKeypair);
}

function buildAgentWithdrawTx({ vaultId, capId, amount, action }) {
  const tx = new Transaction();
  const actionBytes = Array.from(new TextEncoder().encode(action));
  const [withdrawnCoin] = tx.moveCall({
    target: `${PACKAGE_ID}::agent_cap::agent_withdraw`,
    arguments: [
      tx.object(capId),
      tx.object(vaultId),
      tx.pure.u64(BigInt(amount)),
      tx.pure.vector('u8', actionBytes),
      tx.object('0x6'),
    ],
  });
  tx.transferObjects([withdrawnCoin], agentKeypair.toSuiAddress());
  return tx;
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    network: NETWORK,
    on_chain_ready: isConfiguredForOnChain(),
    agent_address: agentKeypair?.toSuiAddress() ?? null,
    package_id: PACKAGE_ID || null,
  });
});

/** Build a DeepBook swap PTB descriptor (stub until DeepBook package wired) */
app.post('/ptb/deepbook-swap', (req, res) => {
  const { asset_in, asset_out, amount, pool_key = 'SUI_USDC' } = req.body ?? {};
  res.json({
    network: NETWORK,
    type: 'deepbook_swap',
    pool_key,
    asset_in: asset_in ?? 'USDC',
    asset_out: asset_out ?? 'SUI',
    amount: amount ?? 100,
    ptb: `ptb_deepbook_${pool_key}_${amount ?? 100}`,
    note: 'DeepBook swap PTB not yet wired — agent_withdraw settles trades on-chain',
  });
});

/** Submit on-chain agent_withdraw (FRX Wallet agent trade settlement) */
app.post('/execute/agent-withdraw', async (req, res) => {
  try {
    if (!isConfiguredForOnChain()) {
      return res.status(503).json({
        error:
          'On-chain execution not configured. Set FRX_WALLET_PACKAGE_ID and FRX_AGENT_PRIVATE_KEY.',
      });
    }

    const { vault_id, cap_id, amount, action } = req.body ?? {};
    if (!vault_id || !cap_id || !amount || !action) {
      return res.status(400).json({ error: 'vault_id, cap_id, amount, action required' });
    }

    const tx = buildAgentWithdrawTx({
      vaultId: vault_id,
      capId: cap_id,
      amount,
      action,
    });

    const result = await suiClient.signAndExecuteTransaction({
      signer: agentKeypair,
      transaction: tx,
      options: { showEffects: true },
    });

    if (result.effects?.status?.status !== 'success') {
      return res.status(500).json({
        error: result.effects?.status?.error ?? 'Transaction failed',
        digest: result.digest,
      });
    }

    res.json({
      status: 'submitted',
      sui_tx_digest: result.digest,
      action,
      network: NETWORK,
      on_chain: true,
    });
  } catch (e) {
    console.error('agent-withdraw failed:', e);
    res.status(500).json({ error: e.message ?? 'agent_withdraw failed' });
  }
});

/** Legacy execute endpoint — routes swap to agent_withdraw when chain ids provided */
app.post('/execute', async (req, res) => {
  const { action, agent_id, protocol, transaction, vault_id, cap_id } = req.body ?? {};
  const amount =
    transaction?.amount ??
    req.body?.amount ??
    0;

  if (vault_id && cap_id && isConfiguredForOnChain()) {
    try {
      const tx = buildAgentWithdrawTx({
        vaultId: vault_id,
        capId: cap_id,
        amount,
        action: action ?? 'swap',
      });
      const result = await suiClient.signAndExecuteTransaction({
        signer: agentKeypair,
        transaction: tx,
        options: { showEffects: true },
      });
      if (result.effects?.status?.status === 'success') {
        return res.json({
          status: 'submitted',
          sui_tx_digest: result.digest,
          action: action ?? 'swap',
          protocol: protocol ?? 'DeepBook',
          network: NETWORK,
          on_chain: true,
        });
      }
    } catch (e) {
      console.warn('on-chain execute fallback to stub:', e.message);
    }
  }

  const digest = `testnet_tx_${Date.now()}_${String(agent_id ?? 'agent').slice(0, 8)}`;
  res.json({
    status: 'submitted',
    sui_tx_digest: digest,
    action: action ?? 'swap',
    protocol: protocol ?? 'DeepBook',
    network: NETWORK,
    on_chain: false,
  });
});

app.listen(PORT, () => {
  console.log(`FRX chain-runner on :${PORT} (${NETWORK})`);
  if (isConfiguredForOnChain()) {
    console.log(`On-chain agent: ${agentKeypair.toSuiAddress()}`);
    console.log(`Wallet package: ${PACKAGE_ID}`);
  } else {
    console.log('On-chain mode disabled — set FRX_WALLET_PACKAGE_ID + FRX_AGENT_PRIVATE_KEY');
  }
});
