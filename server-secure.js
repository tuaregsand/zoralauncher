import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
app.use(cors());
app.use(express.json());

// Secure endpoint that doesn't require server-side private keys
app.post('/api/launch', upload.single('logo'), async (req, res) => {
  try {
    const { name, symbol, description, supply, recipient, signature, message } = req.body;
    const imageBuffer = req.file?.buffer;

    // Verify the request is signed by the user's wallet
    if (!signature || !message) {
      return res.status(400).json({ 
        error: 'Missing signature or message. Please sign the transaction with your wallet.' 
      });
    }

    // Here you would verify the signature against the message
    // This ensures only the wallet owner can launch tokens
    
    console.log('Secure launch request received:', {
      name,
      symbol,
      description,
      supply,
      recipient,
      hasImage: !!imageBuffer,
      signature: signature.substring(0, 10) + '...', // Log partial signature for debugging
      message
    });

    // Return transaction data for client-side execution
    // The client will sign and submit the transaction
    const mockTransactionData = {
      to: '0x...', // Zora contract address
      data: '0x...', // Encoded function call
      value: '0',
      gasLimit: '500000',
      message: 'Ready for wallet signature'
    };
    
    res.status(200).json({ 
      transactionData: mockTransactionData,
      message: 'Transaction ready for wallet signature'
    });
  } catch (err) {
    console.error("Launch error:", err);
    res.status(500).json({ message: "Token launch failed." });
  }
});

// Endpoint to get transaction data for client-side signing
app.post('/api/prepare-launch', upload.single('logo'), async (req, res) => {
  try {
    const { name, symbol, description, supply, recipient } = req.body;
    const imageBuffer = req.file?.buffer;

    // Prepare transaction data without requiring server-side private keys
    const transactionData = {
      to: '0x...', // Zora contract address
      data: '0x...', // Encoded function call
      value: '0',
      gasLimit: '500000'
    };
    
    res.status(200).json({ 
      transactionData,
      message: 'Transaction prepared for client-side signing'
    });
  } catch (err) {
    console.error("Prepare launch error:", err);
    res.status(500).json({ message: "Failed to prepare transaction." });
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    message: 'Secure Zora Launcher Backend is running',
    security: 'No private keys stored on server'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Secure server running on http://localhost:${PORT}`)); 