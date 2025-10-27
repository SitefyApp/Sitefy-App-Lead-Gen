# DataZapp Proxy Server

A simple Node.js proxy server that solves DataZapp's IP whitelisting requirement for cloud platforms like Lovable.

## 🚀 Quick Start

1. **Deploy to Railway** (recommended):
   - Sign up at https://railway.app
   - Create new project from GitHub
   - Add environment variables (see below)
   - Enable static outbound IP ($5/month)
   - Get your static IP and whitelist it with DataZapp

2. **Configure Environment Variables**:
   ```
   DATAZAPP_TOKEN=your_datazapp_token
   PROXY_API_KEY=your_secure_random_key
   ```

3. **Whitelist Your IP**:
   - Email [email protected]
   - Request: "Please whitelist IP xxx.xxx.xxx.xxx for API access"

4. **Use from Lovable**:
   ```typescript
   const response = await fetch('https://your-proxy.railway.app/api/reverse-ip-append', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'x-api-key': 'your_proxy_api_key'
     },
     body: JSON.stringify({
       ipAddresses: ['8.8.8.8']
     })
   });
   ```

## 📚 Full Documentation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions and troubleshooting.

See [lovable-integration-example.ts](./lovable-integration-example.ts) for Lovable integration examples.

## 🔐 Security

- This proxy requires authentication via `x-api-key` header
- Store your `PROXY_API_KEY` securely in environment variables
- Never commit `.env` file to git

## 🛠️ API Endpoints

- `GET /health` - Health check
- `POST /api/reverse-ip-append` - Enrich IP addresses with contact data
- `POST /api/visitor-pixel-data` - Get visitor pixel data
- `POST /api/datazapp-proxy` - Generic DataZapp API proxy

## 💰 Costs

- **Railway**: ~$5/month with static IP
- **DataZapp**: $0.03 per matched IP
- **Your markup**: Charge users $0.10-0.25 per lookup for profit

## 📞 Support

For issues with:
- DataZapp API: [email protected]
- This proxy: Check the DEPLOYMENT.md troubleshooting section

## ✅ Will This Work?

**YES!** This proxy:
- ✅ Solves IP whitelisting issues
- ✅ Works with Lovable Cloud
- ✅ Provides a static IP for DataZapp
- ✅ Adds security layer with API key authentication
- ✅ Handles all DataZapp API endpoints
- ✅ Costs ~$5/month
- ✅ Can be deployed in 10 minutes

---

Built for developers who need DataZapp API access from cloud platforms with dynamic IPs.
