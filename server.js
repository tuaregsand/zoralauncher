import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import { createCoin, DeployCurrency, InitialPurchaseCurrency, createMetadataBuilder, createZoraUploaderForCreator, validateMetadataURIContent } from '@zoralabs/coins-sdk';
import { createWalletClient, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
app.use(cors());
app.use(express.json());

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

app.post('/api/launch', upload.single('logo'), async (req, res) => {
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

    console.log('Launch request received:', {
      name,
      symbol,
      description,
      supply,
      recipient,
      hasImage: !!imageBuffer
    });

    // Use the metadata builder as shown in the official documentation
    const metadataBuilder = createMetadataBuilder()
      .withName(name)
      .withSymbol(symbol)
      .withDescription(description || "");

    // Add image if provided
    if (imageBuffer) {
      const mimeType = req.file?.mimetype || 'image/png';
      const fileName = req.file?.originalname || 'token.png';

      try {
        const file = new File([imageBuffer], fileName, { type: mimeType });
        metadataBuilder.withImage(file);
        console.log('Image added to metadata builder successfully');
      } catch (imageError) {
        console.error('Error adding image to metadata builder:', imageError);
        // Fallback to placeholder if image fails
        const placeholderFile = new File(['FILE'], "test.png", { type: "image/png" });
        metadataBuilder.withImage(placeholderFile);
        console.log('Using placeholder image due to error');
      }
    } else {
      console.log('No image provided, using default placeholder image');
      // Use File instead of Blob
      const placeholderFile = new File(['FILE'], "test.png", { type: "image/png" });
      metadataBuilder.withImage(placeholderFile);
      console.log('Default placeholder image added to metadata builder');
    }

    // Upload metadata to get a proper ValidMetadataURI (IPFS URI)
    let createMetadataParameters;
    try {
      console.log('Uploading metadata to Zora...');
      const result = await metadataBuilder
        .upload(createZoraUploaderForCreator(account.address));
      createMetadataParameters = result.createMetadataParameters;

      console.log('Metadata uploaded successfully:', {
        name: createMetadataParameters.name,
        symbol: createMetadataParameters.symbol,
        hasUri: !!createMetadataParameters.uri
      });
    } catch (uploadError) {
      console.error('Error uploading metadata:', uploadError);
      // Use fallback metadata if upload fails
      const fallbackMetadata = `data:application/json;base64,${Buffer.from(JSON.stringify({
        name,
        symbol,
        description: description || "",
        image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
      })).toString('base64')}`;

      createMetadataParameters = {
        name,
        symbol,
        uri: fallbackMetadata
      };
      console.log('Using fallback metadata');
    }

    // Use the uploaded metadata parameters
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

    res.status(200).json({
      address: result.address,
      hash: result.hash,
      deployment: result.deployment,
      message: 'Token launched successfully on Zora!'
    });

  } catch (err) {
    console.error("Launch error:", err);
    res.status(500).json({
      message: "Token launch failed.",
      error: err.message
    });
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    message: 'Zora Launcher Backend is running',
    walletConfigured: !!account,
    address: account?.address,
    note: 'Ready for Zora SDK integration',
    sdkInfo: {
      package: '@zoralabs/coins-sdk',
      docs: 'https://docs.zora.co/coins/sdk/create-coin',
      status: 'Ready for integration'
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
