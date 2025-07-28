# AWS Secrets Manager Setup

## For Maximum Security

### 1. Create Secret in AWS Secrets Manager
```bash
aws secretsmanager create-secret \
    --name "zora-deployer-key" \
    --description "Private key for Zora token deployment" \
    --secret-string '{"DEPLOYER_PRIVATE_KEY":"your_private_key_here"}'
```

### 2. Update server.js to use AWS Secrets Manager
```javascript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const secretsClient = new SecretsManagerClient({ region: "us-east-1" });

async function getPrivateKey() {
  try {
    const command = new GetSecretValueCommand({
      SecretId: "zora-deployer-key",
    });
    const response = await secretsClient.send(command);
    const secret = JSON.parse(response.SecretString);
    return secret.DEPLOYER_PRIVATE_KEY;
  } catch (error) {
    console.error("Error retrieving secret:", error);
    return null;
  }
}
```

### 3. Deploy to AWS with proper IAM roles
- Use AWS ECS, Lambda, or EC2
- Configure IAM roles with minimal permissions
- Enable CloudTrail for audit logging

## Security Benefits:
- ✅ Keys encrypted at rest and in transit
- ✅ Access controlled by IAM policies
- ✅ Audit trail of all access
- ✅ Automatic key rotation
- ✅ No keys in environment variables 