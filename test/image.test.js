import request from 'supertest';
import fs from 'fs';
import app from '../src/app.js';

process.env.DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '0x' + '22'.repeat(32);
process.env.SKIP_CHAIN = 'true';

describe('Image upload integration', () => {
  it('uploads image and returns metadata URI with image ref', async () => {
    const res = await request(app)
      .post('/api/launch')
      .field('name', 'ImgTest')
      .field('symbol', 'IMG')
      .field('recipient', '0x0000000000000000000000000000000000000000')
      .attach('logo', fs.readFileSync('test.png'), 'test.png');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('metadataUri');
    // quick sanity check – ensure the URI references ipfs or data:image
    expect(res.body.metadataUri.startsWith('ipfs://') || res.body.metadataUri.startsWith('data:')).toBe(true);
  });
}); 