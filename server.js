import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
// Load environment variables before anything else (especially before dynamic import)
dotenv.config();
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
// Node does not provide the File class globally in most runtimes. fetch-blob already ships with a
// standards-compliant implementation, so we re-export it here. This guarantees the `new File()`
// calls below work regardless of the Node version used in production (Vercel, Railway, etc.).
import { File as PolyFile } from 'fetch-blob/file.js';
// Force override to ensure the same class is used across the app and the SDK
globalThis.File = PolyFile;
// Import Zora SDK dynamically after polyfilling File so that the SDK captures the correct File class
const {
  createCoin,
  DeployCurrency,
  InitialPurchaseCurrency,
  createMetadataBuilder,
  createZoraUploaderForCreator,
  validateMetadataURIContent,
  setApiKey
} = await import('@zoralabs/coins-sdk');

// Configure Zora API key for metadata uploads
if (process.env.ZORA_API_KEY) {
  setApiKey(process.env.ZORA_API_KEY);
  console.log('✓ Zora API key set');
} else {
  console.warn('⚠️  ZORA_API_KEY not found – falling back to inline metadata');
}
import { createWalletClient, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';


const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max image
  }
});

// Security: HTTP headers
app.use(helmet());

// CORS whitelist
const allowedOrigins = new Set([
  'http://localhost',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://www.incrypt.net',
  'https://app.incrypt.net'
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  }
}));

app.use(express.json());

// Rate limiter specific to launch endpoint
const launchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 launches per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many token launches from this IP, please try again later.' }
});

// Simple API key middleware (optional, set API_KEY env). Applies only to POST /api/launch
function checkApiKey(req, res, next) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return next(); // No key set, skip check
  const provided = req.headers['x-api-key'];
  if (provided !== apiKey) {
    return res.status(401).json({ error: 'Invalid API Key' });
  }
  next();
}

if (!process.env.DEPLOYER_PRIVATE_KEY) {
  console.warn('Warning: DEPLOYER_PRIVATE_KEY not set in environment variables');
}

let account, walletClient, publicClient;

if (process.env.DEPLOYER_PRIVATE_KEY) {
  try {
    account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY.startsWith('0x') ? process.env.DEPLOYER_PRIVATE_KEY : `0x${process.env.DEPLOYER_PRIVATE_KEY}`);

    publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.RPC_URL || "https://mainnet.base.org"),
    });

    walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(process.env.RPC_URL || "https://mainnet.base.org"),
    });

    console.log('Wallet client configured with address:', account.address);
  } catch (error) {
    console.error('Error setting up wallet client:', error);
  }
}

app.post('/api/launch', launchLimiter, checkApiKey, upload.single('logo'), async (req, res) => {
  try {
    const { name, symbol, description, supply, recipient } = req.body;
    const imageBuffer = req.file?.buffer;

    if (!name || !symbol || !recipient) {
      return res.status(400).json({
        error: 'Missing required fields: name, symbol, and recipient are required'
      });
    }

    if (!account || !walletClient || !publicClient) {
      return res.status(500).json({
        error: 'Wallet not configured. Please set DEPLOYER_PRIVATE_KEY environment variable.'
      });
    }

    // Ensure an image was actually sent. We used to silently insert a placeholder, which resulted in
    // every coin being minted with the Zora fallback image. By returning an error instead, the
    // frontend immediately learns that it forgot to attach the file under the expected `logo`
    // field (or used multipart/form-data incorrectly).
    if (!imageBuffer) {
      return res.status(400).json({
        error: 'No image provided. Please attach your image under the "logo" form field.'
      });
    }

    console.log('Launch request received:', {
      name,
      symbol,
      description,
      supply,
      recipient,
      hasImage: !!imageBuffer
    });

    // -------- Metadata build --------
    const metadataBuilder = createMetadataBuilder()
      .withName(name)
      .withSymbol(symbol)
      .withDescription(description || "");

    try {
      const mimeType = req.file?.mimetype || 'image/png';
      const fileName = req.file?.originalname || 'token.png';
      const file = new globalThis.File([imageBuffer], fileName, { type: mimeType });
      metadataBuilder.withImage(file);
      console.log('Image added to metadata builder successfully');
    } catch (imageError) {
      console.error('Error adding image to metadata builder:', imageError);
      return res.status(500).json({
        error: 'Failed to attach image to metadata. Please try again.'
      });
    }

    // Upload metadata → get URI
    let createMetadataParameters;
    try {
      console.log('Uploading metadata to Zora...');
      const result = await metadataBuilder.upload(
        createZoraUploaderForCreator(account.address)
      );
      createMetadataParameters = result.createMetadataParameters;
      console.log('Metadata uploaded successfully:', {
        name: createMetadataParameters.name,
        symbol: createMetadataParameters.symbol,
        hasUri: !!createMetadataParameters.uri
      });
    } catch (uploadError) {
      console.error('Error uploading metadata:', uploadError);
      // Fallback inline metadata
      const fallbackMetadata = `data:application/json;base64,${Buffer.from(
        JSON.stringify({
          name,
          symbol,
          description: description || "",
          image:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        })
      ).toString('base64')}`;

      createMetadataParameters = {
        name,
        symbol,
        uri: fallbackMetadata
      };
      console.log('Using fallback metadata');
    }

    // ---- Test shortcut ----
    if (process.env.SKIP_CHAIN === 'true') {
      return res.status(200).json({
        metadataUri: createMetadataParameters.uri,
        message:
          'Metadata uploaded; chain interaction skipped due to SKIP_CHAIN=true'
      });
    }

    // -------- Create coin --------
    const coinParams = {
      ...createMetadataParameters,
      payoutRecipient: recipient,
      platformReferrer: account.address,
      currency: DeployCurrency.ZORA,
      chainId: base.id
    };

    console.log('Creating coin with parameters:', {
      name: coinParams.name,
      symbol: coinParams.symbol,
      payoutRecipient: coinParams.payoutRecipient,
      platformReferrer: coinParams.platformReferrer,
      currency: coinParams.currency,
      chainId: coinParams.chainId
    });

    const result = await createCoin(coinParams, walletClient, publicClient, {
      gasMultiplier: 120
    });

    console.log('Coin created successfully:', {
      address: result.address,
      hash: result.hash,
      deployment: result.deployment
    });

    return res.status(200).json({
      address: result.address,
      hash: result.hash,
      deployment: result.deployment,
      message: 'Token launched successfully on Zora!'
    });

  } catch (err) {
    console.error('Launch error:', err);
    return res.status(500).json({
      message: 'Token launch failed.',
      error: err.message
    });
  }
});

// ---------- Health & Root routes ----------
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Zora Launcher Backend is running',
    walletConfigured: !!account,
    address: account?.address
  });
});

app.get('/', (_req, res) => {
  res
    .status(200)
    .send(
      '<h1>Zora Launcher Backend</h1><p>API is alive ✨ – see <a href="/api/health">/api/health</a>.</p>'
    );
});

// Central error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res
    .status(err.status || 500)
    .json({ error: err.message || 'Internal Server Error' });
});

// Start server only if not running inside tests
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`)
  );
}

export default app;