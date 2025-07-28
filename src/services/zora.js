import { env } from '../config/env.js';
import pino from 'pino';
import { File as PolyFile } from 'fetch-blob/file.js';

// ensure File polyfill for SDK
globalThis.File = PolyFile;

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Dynamic import to capture global File
const {
  createCoin,
  DeployCurrency,
  createMetadataBuilder,
  createZoraUploaderForCreator,
  setApiKey
} = await import('@zoralabs/coins-sdk');

setApiKey(env.ZORA_API_KEY);

import { createWalletClient, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

let account, walletClient, publicClient;

export function initWallet() {
  if (account) return { account, walletClient, publicClient };
  const pk = env.DEPLOYER_PRIVATE_KEY.startsWith('0x') ? env.DEPLOYER_PRIVATE_KEY : `0x${env.DEPLOYER_PRIVATE_KEY}`;
  try {
    account = privateKeyToAccount(pk);
    publicClient = createPublicClient({ chain: base, transport: http(env.RPC_URL) });
    walletClient = createWalletClient({ account, chain: base, transport: http(env.RPC_URL) });
    logger.info({ address: account.address }, 'Wallet configured');
  } catch (err) {
    logger.error(err, 'Wallet setup failed');
    throw err;
  }
  return { account, walletClient, publicClient };
}

export async function launchToken({ name, symbol, description, recipient, file }) {
  const { account, walletClient, publicClient } = initWallet();
  const builder = createMetadataBuilder()
    .withName(name)
    .withSymbol(symbol)
    .withDescription(description || '');
  builder.withImage(file);
  const { createMetadataParameters } = await builder.upload(createZoraUploaderForCreator(account.address));

  const coinParams = {
    ...createMetadataParameters,
    payoutRecipient: recipient,
    platformReferrer: account.address,
    currency: DeployCurrency.ZORA,
    chainId: base.id
  };
  return createCoin(coinParams, walletClient, publicClient, { gasMultiplier: 120 });
} 