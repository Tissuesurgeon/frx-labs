#!/usr/bin/env node
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const kp = new Ed25519Keypair();
const address = kp.getPublicKey().toSuiAddress();
const secret = kp.getSecretKey();

console.log('FRX agent keypair (add to .env):');
console.log('');
console.log(`FRX_AGENT_ADDRESS=${address}`);
console.log(`FRX_AGENT_PRIVATE_KEY=${secret}`);
console.log(`NEXT_PUBLIC_FRX_AGENT_ADDRESS=${address}`);
console.log('');
console.log('Fund this address with testnet SUI for agent gas:');
console.log(`https://faucet.sui.io/?address=${address}`);
