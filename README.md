# Zora Launcher Backend

A backend server for launching tokens on the Zora platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. (Optional) Create a `.env` file with your private key:
```bash
DEPLOYER_PRIVATE_KEY=your_private_key_here
```

## Running the Server

### Local Development
```bash
npm start
```

The server will run on `http://localhost:3000`

### Docker
```bash
# Build and run with Docker
docker build -t zora-launcher-backend .
docker run -p 3000:3000 -e DEPLOYER_PRIVATE_KEY=your_key zora-launcher-backend

# Or use Docker Compose
docker-compose up -d
```

## Deployment Options

### 1. Vercel (Recommended for Serverless)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add DEPLOYER_PRIVATE_KEY
```

### 2. Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Set environment variables
railway variables set DEPLOYER_PRIVATE_KEY=your_key
```

### 3. Heroku
```bash
# Install Heroku CLI
# Create app and deploy
heroku create your-app-name
git push heroku main

# Set environment variables
heroku config:set DEPLOYER_PRIVATE_KEY=your_key
```

### 4. DigitalOcean App Platform
- Connect your GitHub repository
- Select Node.js as the environment
- Set environment variables in the dashboard
- Deploy

### 5. AWS/GCP/Azure
Use the provided Dockerfile:
```bash
# Build image
docker build -t zora-launcher-backend .

# Push to container registry
docker tag zora-launcher-backend your-registry/zora-launcher-backend
docker push your-registry/zora-launcher-backend
```

## API Endpoints

### Health Check
- **GET** `/api/health`
- Returns server status and wallet configuration

### Launch Token
- **POST** `/api/launch`
- Accepts multipart form data with:
  - `name`: Token name
  - `symbol`: Token symbol
  - `description`: Token description
  - `supply`: Token supply
  - `recipient`: Recipient address
  - `logo`: Token logo image (optional)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DEPLOYER_PRIVATE_KEY` | Private key for deploying tokens | Yes (for real token creation) |
| `ZORA_API_KEY` | Zora API key for metadata uploads | Yes (for real token creation) |
| `NODE_ENV` | Environment (production/development) | No (defaults to development) |
| `PORT` | Port to run the server on | No (defaults to 3000) |

## Current Status

⚠️ **Note**: The server is currently running in mock mode because the Zora packages (`@zoralabs/coins` and `@zoralabs/metadata`) are not available in the npm registry. The API endpoints will return mock responses.

To enable full functionality, you'll need to:
1. Find the correct package names for the Zora SDK
2. Update the imports in `server.js`
3. Set up your `DEPLOYER_PRIVATE_KEY` environment variable

## Testing

Test the health endpoint:
```bash
curl http://localhost:3000/api/health
```

Test the launch endpoint:
```bash
curl -X POST http://localhost:3000/api/launch \
  -F "name=Test Token" \
  -F "symbol=TEST" \
  -F "description=A test token" \
  -F "supply=1000000" \
  -F "recipient=0x1234567890123456789012345678901234567890"
```

## Production Considerations

1. **Security**: Always use HTTPS in production
2. **Rate Limiting**: Consider adding rate limiting middleware
3. **Logging**: Implement proper logging for production
4. **Monitoring**: Set up health checks and monitoring
5. **Backup**: Ensure your private keys are securely backed up
6. **CORS**: Configure CORS properly for your frontend domain 