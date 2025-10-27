# DataZapp Proxy Server - Deployment Guide

This proxy server solves the IP whitelisting issue with DataZapp API by providing a fixed static IP address.

## 🎯 What This Solves

- **Problem**: DataZapp requires IP whitelisting, but Lovable Cloud uses dynamic IPs
- **Solution**: Deploy this proxy on Railway/Render with a static IP
- **Result**: Your Lovable app → Proxy (fixed IP) → DataZapp API ✅

## 📦 Deployment Options (Choose One)

### Option 1: Railway.app (Recommended - Easiest)

**Why Railway?**
- Static IP available ($5/month)
- Easy deployment from GitHub
- Automatic HTTPS
- Great developer experience

**Steps:**

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Deploy This Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo" (or use "Empty Project" and upload files)
   - Railway will auto-detect Node.js

3. **Add Environment Variables**
   - Go to your project → Variables
   - Add:
     ```
     DATAZAPP_TOKEN=your_token_here
     PROXY_API_KEY=generate_random_secure_key
     ```

4. **Get Your Static IP**
   - Go to Settings → Networking
   - Enable "Public Networking" 
   - Note your URL (e.g., `https://your-app.railway.app`)
   - For static IP: Enable "Static Outbound IP" ($5/month)
   - Copy the static IP address

5. **Whitelist IP with DataZapp**
   - Email [email protected]
   - Request to whitelist your Railway static IP
   - Format: "Please whitelist IP: xxx.xxx.xxx.xxx for API access"

6. **Test Your Proxy**
   ```bash
   curl https://your-app.railway.app/health
   ```

### Option 2: Render.com

**Steps:**

1. **Create Render Account**
   - Go to https://render.com
   - Sign up

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect GitHub or upload files
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Add Environment Variables**
   - Go to Environment tab
   - Add `DATAZAPP_TOKEN` and `PROXY_API_KEY`

4. **Get Static IP**
   - Render provides outbound IPs automatically
   - Check Render dashboard for your service's IP
   - Or deploy and check logs for outbound IP

5. **Whitelist with DataZapp**
   - Email DataZapp support with your Render IP

### Option 3: DigitalOcean Droplet (Most Control)

**Steps:**

1. **Create Droplet**
   - Go to DigitalOcean
   - Create Ubuntu 24.04 droplet ($6/month)
   - Note the static IP address

2. **SSH into Server**
   ```bash
   ssh root@your_droplet_ip
   ```

3. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Upload Your Files**
   ```bash
   # On your local machine
   scp -r datazapp-proxy root@your_droplet_ip:/root/
   ```

5. **Setup and Run**
   ```bash
   cd /root/datazapp-proxy
   npm install
   
   # Create .env file
   nano .env
   # Add your DATAZAPP_TOKEN and PROXY_API_KEY
   
   # Install PM2 for process management
   npm install -g pm2
   pm2 start server.js
   pm2 save
   pm2 startup
   ```

6. **Setup Nginx (Optional - for HTTPS)**
   ```bash
   sudo apt install nginx certbot python3-certbot-nginx
   # Configure nginx reverse proxy
   # Get free SSL with: sudo certbot --nginx
   ```

## 🔐 Security Setup

**Generate Secure API Key:**
```bash
# On Mac/Linux:
openssl rand -hex 32

# Or use online generator:
# https://www.random.org/strings/
```

Save this as your `PROXY_API_KEY` - this is what Lovable will use to authenticate.

## 🧪 Testing Your Proxy

**1. Health Check:**
```bash
curl https://your-proxy-url.com/health
```

Should return:
```json
{
  "status": "ok",
  "message": "DataZapp Proxy Server Running"
}
```

**2. Test Reverse IP Append:**
```bash
curl -X POST https://your-proxy-url.com/api/reverse-ip-append \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_proxy_api_key" \
  -d '{
    "ipAddresses": ["8.8.8.8", "1.1.1.1"]
  }'
```

## 📱 Using from Lovable

**In your Lovable Cloud backend function:**

```typescript
// Lovable Cloud Function
export async function enrichIPAddress(ipAddress: string) {
  const proxyUrl = 'https://your-proxy-url.railway.app/api/reverse-ip-append';
  
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.PROXY_API_KEY // Store in Lovable env vars
    },
    body: JSON.stringify({
      ipAddresses: [ipAddress]
    })
  });
  
  const data = await response.json();
  return data;
}
```

## 💰 Costs

| Platform | Cost | Static IP | Notes |
|----------|------|-----------|-------|
| Railway | $5/month | ✅ Yes | Easiest, best DX |
| Render | $7/month | ✅ Yes | Good alternative |
| DigitalOcean | $6/month | ✅ Yes | Most control |

## 🔄 API Endpoints

Your proxy provides these endpoints:

### 1. Reverse IP Append
```
POST /api/reverse-ip-append
Headers: x-api-key: your_key
Body: { "ipAddresses": ["ip1", "ip2"] }
```

### 2. Visitor Pixel Data
```
POST /api/visitor-pixel-data
Headers: x-api-key: your_key
Body: { "pixelId": "xxx", "startDate": "2024-01-01", "endDate": "2024-01-31" }
```

### 3. Generic DataZapp Proxy
```
POST /api/datazapp-proxy
Headers: x-api-key: your_key
Body: { "endpoint": "http://api.datazapp.com/...", "payload": {...} }
```

## 🐛 Troubleshooting

**"Unauthorized" error:**
- Check your `x-api-key` header matches `PROXY_API_KEY` env var

**"Connection timeout":**
- Verify DataZapp whitelisted your proxy's IP
- Check DataZapp API status

**"ECONNREFUSED":**
- Verify DataZapp endpoint URLs are correct
- Check if DataZapp API is down

**No static IP showing:**
- Railway: Enable "Static Outbound IP" in settings
- Render: Check dashboard for service IPs
- DigitalOcean: IP shown when creating droplet

## 📞 Support

- DataZapp API Docs: https://knowledgebase.datazapp.com/apis/
- DataZapp Support: [email protected]
- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs

## ✅ Checklist

- [ ] Deployed proxy to Railway/Render/DigitalOcean
- [ ] Got static IP address
- [ ] Added environment variables (DATAZAPP_TOKEN, PROXY_API_KEY)
- [ ] Emailed DataZapp to whitelist your IP
- [ ] Tested /health endpoint
- [ ] Tested reverse IP append with sample IPs
- [ ] Connected Lovable app to proxy
- [ ] Stored PROXY_API_KEY in Lovable environment variables

## 🎉 You're Done!

Your Lovable app can now call DataZapp API through your proxy without IP whitelisting issues!
