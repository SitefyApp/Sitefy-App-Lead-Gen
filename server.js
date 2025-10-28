const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API key authentication middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.PROXY_API_KEY;

  if (!expectedKey) {
    return res.status(500).json({ error: 'PROXY_API_KEY not configured on server' });
  }

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  next();
};

// DataZapp v2 API configuration
const DATAZAPP_API_URL = process.env.DATAZAPP_API_URL || 'https://secureapi.datazapp.com/Appendv2';
const DATAZAPP_API_KEY = process.env.DATAZAPP_API_KEY;

// Reverse IP Append endpoint - DataZapp v2 format
app.post('/api/reverse-ip-append', authenticateApiKey, async (req, res) => {
  try {
    console.log('📨 Received reverse IP append request');
    
    const ipAddresses = req.body.ipAddresses;
    
    if (!ipAddresses || !Array.isArray(ipAddresses) || ipAddresses.length === 0) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    const ipAddress = ipAddresses[0]; // Get first IP from array
    console.log('🔍 Processing IP:', ipAddress);

    if (!DATAZAPP_API_KEY) {
      return res.status(500).json({ error: 'DATAZAPP_API_KEY not configured' });
    }

    console.log('🚀 Calling DataZapp v2 API...');
    console.log('📡 URL:', DATAZAPP_API_URL);
    console.log('🔑 API Key present:', DATAZAPP_API_KEY.substring(0, 4) + '...');

    // DataZapp v2 API format
    const requestBody = {
      ApiKey: DATAZAPP_API_KEY,
      AppendModule: 'ReverseIPAppend',
      AppendType: 1,  // 1 = Advanced IP Append
      Data: [
        {
          IP: ipAddress
        }
      ]
    };

    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

    const response = await axios.post(DATAZAPP_API_URL, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ DataZapp API response status:', response.status);
    console.log('📊 Response data:', JSON.stringify(response.data, null, 2));

    // DataZapp v2 returns an array of results
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const result = response.data[0];
      
      // Check if we got useful data
      const hasData = result.FirstName || result.LastName || result.Email || 
                      result.Phone || result.Cell;
      
      if (!hasData) {
        return res.status(404).json({ 
          error: 'No data available for this IP',
          message: 'IP lookup returned no results'
        });
      }

      return res.json(result);
    }

    return res.status(404).json({ 
      error: 'No data available for this IP',
      message: 'No results returned from DataZapp'
    });

  } catch (error) {
    console.error('❌ Error calling DataZapp API:', error.message);
    
    if (error.response) {
      console.error('📛 Response status:', error.response.status);
      console.error('📛 Response data:', JSON.stringify(error.response.data, null, 2));
      
      // Handle VPN/Proxy detection
      if (error.response.status === 400 && 
          error.response.data?.message?.toLowerCase().includes('vpn')) {
        return res.status(400).json({
          error: 'VPN/Proxy detected',
          message: 'This IP appears to be from a VPN or proxy service'
        });
      }
      
      return res.status(error.response.status).json({
        error: 'DataZapp API error',
        details: error.response.data
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to call DataZapp API',
      message: error.message 
    });
  }
});

// Test endpoint to verify DataZapp v2 connection
app.get('/api/test', authenticateApiKey, async (req, res) => {
  try {
    console.log('🧪 Testing DataZapp v2 API connection...');
    
    if (!DATAZAPP_API_KEY) {
      return res.status(500).json({ error: 'DATAZAPP_API_KEY not configured' });
    }

    const testIP = '8.8.8.8'; // Google DNS for testing
    
    const requestBody = {
      ApiKey: DATAZAPP_API_KEY,
      AppendModule: 'ReverseIPAppend',
      AppendType: 1,  // 1 = Advanced IP Append
      Data: [
        {
          IP: testIP
        }
      ]
    };

    console.log('📤 Test request:', JSON.stringify(requestBody, null, 2));

    const response = await axios.post(DATAZAPP_API_URL, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ Test successful!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));

    res.json({
      success: true,
      message: 'DataZapp v2 API connection successful',
      testIP: testIP,
      response: response.data
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('📛 Response:', JSON.stringify(error.response.data, null, 2));
      return res.status(500).json({
        success: false,
        error: 'DataZapp API test failed',
        status: error.response.status,
        details: error.response.data
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to test DataZapp API',
      message: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 DataZapp Proxy Server running on port ${PORT}`);
  console.log('📡 API URL:', DATAZAPP_API_URL);
  console.log('🔑 API Key configured:', !!DATAZAPP_API_KEY);
});
