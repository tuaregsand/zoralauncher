import { cleanEnv, str, url } from 'envalid';
import dotenv from 'dotenv';

// Load env vars from .env file
dotenv.config();

export const env = cleanEnv(process.env, {
  DEPLOYER_PRIVATE_KEY: str(),
  ZORA_API_KEY: str(),
  RPC_URL: url({ default: 'https://mainnet.base.org' }),
  API_KEY: str({ default: '' }),
  PORT: str({ default: '3000' }),
  REDIS_URL: str({ default: 'redis://localhost:6379' })
}); 