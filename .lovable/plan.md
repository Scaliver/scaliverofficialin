

# AWS Proxy Server for Matrix Sols API

## Problem
Matrix Sols only allows whitelisting **one IP address**, but Lovable Cloud backend functions use rotating IPs. This causes 403 errors for username checking, order creation, and delivery tracking.

## Solution
Host a simple proxy server on **AWS EC2** with a single static IP (Elastic IP). All Matrix Sols API calls will route through this proxy.

```text
Your App --> Lovable Cloud Function --> AWS Proxy (Static IP) --> Matrix Sols API
```

## What You Need to Do on AWS

### Step 1: Launch an EC2 Instance
1. Go to AWS Console > EC2 > Launch Instance
2. Choose **Amazon Linux 2023** or **Ubuntu 22.04** (free tier eligible: t2.micro or t3.micro)
3. Create or select a key pair for SSH access
4. In Security Group, allow:
   - **Inbound**: Port 3000 (or 443) from anywhere (0.0.0.0/0)
   - **Inbound**: Port 22 for SSH (your IP only)
5. Launch the instance

### Step 2: Attach an Elastic IP (Static IP)
1. Go to EC2 > Elastic IPs > Allocate Elastic IP
2. Associate it with your EC2 instance
3. Note down this IP -- this is the **one IP** you whitelist in Matrix Sols

### Step 3: Install Node.js and Run the Proxy
SSH into your instance and run:
```
sudo yum install -y nodejs npm   # Amazon Linux
# OR
sudo apt install -y nodejs npm   # Ubuntu

mkdir matrix-proxy && cd matrix-proxy
npm init -y
npm install express
```

Create `server.js` with this proxy code:
```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

const MATRIX_BASE = 'https://matrixsols.in/api/digital-top-ups';

app.post('/proxy', async (req, res) => {
  try {
    const { endpoint, payload, api_key, client_id } = req.body;
    
    const body = JSON.stringify(payload);
    const sigString = `${api_key};${body}`;
    const signature = crypto
      .createHmac('sha256', api_key)
      .update(sigString)
      .digest('hex');

    const response = await fetch(`${MATRIX_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Client-Id': client_id,
      },
      body,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Proxy running on port 3000'));
```

Start it:
```
node server.js &
# Or use pm2 for auto-restart:
npm install -g pm2
pm2 start server.js
pm2 startup
pm2 save
```

### Step 4: Whitelist in Matrix Sols
Add your **Elastic IP** (e.g., `13.127.xx.xx`) as the single whitelisted IP in Matrix Sols dashboard.

## What I Will Change in Code

### 1. Update `digital-topup` Edge Function
- Instead of calling `matrixsols.in` directly, it will call your AWS proxy
- The proxy URL will be stored as a secret (`MATRIX_PROXY_URL`)
- The edge function will send the endpoint, payload, API key, and client ID to the proxy
- The proxy generates the signature and forwards to Matrix Sols

### 2. Add Secret for Proxy URL
- You will need to add one new secret: `MATRIX_PROXY_URL` (e.g., `http://YOUR_ELASTIC_IP:3000`)

## Estimated Cost
- EC2 t2.micro/t3.micro: **Free** for 12 months (AWS free tier), then ~$8/month
- Elastic IP: **Free** while attached to a running instance

## After Setup
Once the proxy is running and the Elastic IP is whitelisted in Matrix Sols:
- Username checking will work
- Automatic order creation will work
- Order tracking and delivery status will work
- All API calls go through your single static IP

