import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { launchToken } from '../services/zora.js';
import { logger } from '../app.js';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true });

router.post('/', limiter, upload.single('logo'), async (req, res) => {
  try {
    const { name, symbol, description, recipient } = req.body;
    if (!name || !symbol || !recipient) return res.status(400).json({ error: 'missing fields' });
    const imageBuffer = req.file?.buffer;
    if (!imageBuffer) return res.status(400).json({ error: 'no image' });

    const file = new File([imageBuffer], req.file.originalname || 'token.png', { type: req.file.mimetype });
    const result = await launchToken({ name, symbol, description, recipient, file });
    res.json({ ...result, message: 'Token launched!' });
  } catch (err) {
    logger.error(err, 'launch route error');
    res.status(500).json({ error: err.message });
  }
});

export default router; 