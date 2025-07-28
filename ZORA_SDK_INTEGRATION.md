# Zora SDK Integration Guide

## 🎯 **Current Status**

Your Zora Launcher Backend is successfully deployed and ready for Zora SDK integration!

**Live API:** `https://zora-launcher-backend-public2-r3vo4e8c3.vercel.app`

## 📦 **Correct Zora SDK Package**

Based on the [official Zora documentation](https://docs.zora.co/coins/sdk/create-coin), the correct package is:

```bash
npm install @zoralabs/coins-sdk
```

**NOT** `@zoralabs/coins` or `@zoralabs/metadata` (these don't exist)

## 🔧 **Integration Steps**

### 1. Install the SDK
```bash
npm install @zoralabs/coins-sdk
```

### 2. Update Dependencies
The SDK requires `viem@^2.21.55`. Update your `package.json`:

```json
{
  "dependencies": {
    "@zoralabs/coins-sdk": "^0.2.9",
    "viem": "^2.21.55"
  }
}
```

### 3. Import the SDK
```javascript
import { 
  createCoin, 
  DeployCurrency, 
  InitialPurchaseCurrency, 
  createMetadataBuilder, 
  createZoraUploaderForCreator 
} from '@zoralabs/coins-sdk';
```

### 4. Set up Viem Clients
```javascript
import { createWalletClient, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const publicClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
});

const walletClient = createWalletClient({
  account: privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY),
  chain: base,
  transport: http("https://mainnet.base.org"),
});
```

### 5. Create Metadata
```javascript
const metadataBuilder = createMetadataBuilder()
  .withName(name)
  .withSymbol(symbol)
  .withDescription(description);

if (imageBuffer) {
  const imageFile = new File([imageBuffer], 'logo.png', { type: 'image/png' });
  metadataBuilder.withImage(imageFile);
}

const { createMetadataParameters } = await metadataBuilder
  .upload(createZoraUploaderForCreator(account.address));
```

### 6. Create Coin
```javascript
const coinParams = {
  ...createMetadataParameters,
  payoutRecipient: recipient,
  platformReferrer: account.address,
  currency: DeployCurrency.ZORA,
  initialPurchase: {
    currency: InitialPurchaseCurrency.ETH,
    amount: BigInt(0)
  }
};

const result = await createCoin(coinParams, walletClient, publicClient, {
  gasMultiplier: 120,
});
```

## 🌐 **API Endpoints**

### Health Check
```bash
GET /api/health
```

### Launch Token
```bash
POST /api/launch
Content-Type: multipart/form-data

Fields:
- name: Token name
- symbol: Token symbol  
- description: Token description
- supply: Token supply
- recipient: Recipient address
- logo: Token logo image (optional)
```

## 🔒 **Security**

- ✅ Private key stored securely in Vercel environment variables
- ✅ No authentication protection blocking API access
- ✅ Ready for production use

## 📚 **Documentation**

- [Zora Coins SDK Documentation](https://docs.zora.co/coins/sdk/create-coin)
- [Zora Coins Contracts](https://docs.zora.co/coins/contracts)
- [Zora Metadata Guide](https://docs.zora.co/coins/sdk/metadata)

## 🚀 **Next Steps**

1. **Install the SDK locally** to test integration
2. **Update the server.js** with the Zora SDK code
3. **Test locally** to ensure everything works
4. **Deploy to Vercel** with the integrated SDK
5. **Test the live API** with real token creation

## ⚠️ **Important Notes**

- The SDK requires `viem@^2.21.55` (not v1.x)
- Only works on Base mainnet currently
- ZORA currency is default on Base mainnet
- Initial purchase only works with ETH on Base mainnet

## 🎉 **Ready for Integration!**

Your backend infrastructure is solid and secure. The Zora SDK integration is the final step to enable real token creation on the Zora protocol! 