

# Update MATRIX_PROXY_URL Secret

## What needs to happen
Update the `MATRIX_PROXY_URL` secret value to `http://13.49.201.241:3000` so the `digital-topup` edge function routes all Matrix Sols API calls through your AWS proxy.

## Technical Details
- **Secret**: `MATRIX_PROXY_URL`
- **New Value**: `http://13.49.201.241:3000`
- The edge function already appends `/proxy` to this URL when making requests, so we store just the base URL

## After this change
- The edge function will call `http://13.49.201.241:3000/proxy` for all Matrix Sols requests
- Your proxy (running on EC2 with Elastic IP `13.49.201.241`) forwards to Matrix Sols
- Make sure this IP is whitelisted in your Matrix Sols dashboard

## Remaining step (on your side)
- Whitelist `13.49.201.241` in the Matrix Sols API dashboard if not done already

