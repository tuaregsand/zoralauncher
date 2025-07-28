import request from 'supertest';
import app from '../server.js';

// Dummy env vars for SDK setup
process.env.DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '0x' + '11'.repeat(32);

describe('Zora Launcher API', () => {
  it('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('POST /api/launch missing image returns 400', async () => {
    const res = await request(app)
      .post('/api/launch')
      .field('name', 'UnitTest')
      .field('symbol', 'UT')
      .field('recipient', '0x0000000000000000000000000000000000000000');
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
}); 