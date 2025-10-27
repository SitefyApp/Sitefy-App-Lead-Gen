const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Authentication middleware - protect your proxy
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.PROXY_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'DataZapp Proxy Server Running' });
});

// Reverse IP Append endpoint - CORRECTED WITH IP FIELD
app.post('/api/reverse-ip-append', authenticate, async (req, res) => {
  try {
    const { ipAddresses } = req.body;
    
    if (!ipAddresses || !Array.isArray(ipAddresses)) {
      return res.status(400).json({ 
        error: 'ipAddresses array is required' 
      });
    }

    console.log(`Processing ${ipAddresses.length} IP addresses...`);
    
    // Call DataZapp API with CORRECT format (using IP, not IPAddress)
    const response = await axios.post(
      'https://secureapi.datazapp.com/Appendv2',
      {
        ApiKey: process.env.DATAZAPP_API_KEY,
        AppendModule: 'ReverseIPAppend',
        AppendType: 2,  // MUST be number 2, not string
        Data: ipAddresses.map(ip => ({ IP: ip }))  // ✅ FIXED: Use IP instead of IPAddress
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    console.log('DataZapp response received:', JSON.stringify(response.data, null, 2));
    
    // Return DataZapp response exactly as-is
    return res.json(response.data);

  } catch (error) {
    console.error('DataZapp API Error:', error.message);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    
    return res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data
    });
  }
});

// Get visitor pixel data endpoint
app.post('/api/visitor-pixel-data', authenticate, async (req, res) => {
  try {
    const { pixelId, startDate, endDate } = req.body;
    
    const datazappUrl = 'https://api.datazapp.com/v1/pixel/visitors';
    
    const datazappPayload = {
      Token: process.env.DATAZAPP_TOKEN,
      PixelId: pixelId,
      StartDate: startDate,
      EndDate: endDate
    };

    const response = await axios.post(datazappUrl, datazappPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('DataZapp Pixel API Error:', error.message);
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

// Generic DataZapp API proxy (for other endpoints)
app.post('/api/datazapp-proxy', authenticate, async (req, res) => {
  try {
    const { endpoint, payload } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'endpoint is required' });
    }

    const datazappPayload = {
      Token: process.env.DATAZAPP_TOKEN,
      ...payload
    };

    const response = await axios.post(endpoint, datazappPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('DataZapp Generic API Error:', error.message);
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`DataZapp Proxy Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
