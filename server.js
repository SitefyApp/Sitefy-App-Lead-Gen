const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables
const DATAZAPP_API_URL = process.env.DATAZAPP_API_URL || 'https://secureapi.datazapp.com/Appendv2';
const DATAZAPP_API_KEY = process.env.DATAZAPP_API_KEY;
const PROXY_API_KEY = process.env.PROXY_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

// API Key validation middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== PROXY_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    datazappConfigured: !!DATAZAPP_API_KEY
  });
});

// Test endpoint (no auth required for testing)
app.post('/api/test', async (req, res) => {
  try {
    const { ipAddress } = req.body;
    
    if (!ipAddress) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    if (!DATAZAPP_API_KEY) {
      return res.status(500).json({ error: 'DATAZAPP_API_KEY not configured' });
    }

    console.log('🧪 Test request for IP:', ipAddress);
    console.log('🔑 Using API Key:', DATAZAPP_API_KEY.substring(0, 10) + '...');
    console.log('📡 API URL:', DATAZAPP_API_URL);

    const requestBody = {
      ApiKey: DATAZAPP_API_KEY,
      AppendModule: 'ReverseIPAppend',
      AppendType: 5,  // Basic + Advanced IP append (cell / phone available)
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

    console.log('✅ Response status:', response.status);
    console.log('📥 Response data:', JSON.stringify(response.data, null, 2));

    return res.json({
      success: true,
      status: response.status,
      data: response.data,
      requestSent: requestBody
    });

  } catch (error) {
    console.error('❌ Test error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      return res.status(error.response.status).json({
        error: 'DataZapp API error',
        status: error.response.status,
        details: error.response.data
      });
    }
    return res.status(500).json({ 
      error: 'Request failed', 
      details: error.message 
    });
  }
});

// Main reverse IP append endpoint
app.post('/api/reverse-ip-append', validateApiKey, async (req, res) => {
  try {
    const { ipAddresses } = req.body;
    
    if (!ipAddresses || !Array.isArray(ipAddresses) || ipAddresses.length === 0) {
      return res.status(400).json({ error: 'Invalid request: ipAddresses array is required' });
    }

    if (!DATAZAPP_API_KEY) {
      return res.status(500).json({ error: 'DataZapp API key not configured' });
    }

    // Process the first IP address (DataZapp v2 format)
    const ipAddress = ipAddresses[0];
    
    console.log('🔍 Processing IP:', ipAddress);

    const requestBody = {
      ApiKey: DATAZAPP_API_KEY,
      AppendModule: 'ReverseIPAppend',
      AppendType: 5,  // Basic + Advanced IP append (cell / phone available)
      Data: [
        {
          IP: ipAddress
        }
      ]
    };

    const response = await axios.post(DATAZAPP_API_URL, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ DataZapp response status:', response.status);

    // DataZapp v2 returns an array of results
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const result = response.data[0];
      
      // Check if we got actual data
      if (!result.FirstName && !result.LastName && !result.Email && !result.Phone) {
        console.log('⚠️ No data returned for IP:', ipAddress);
        return res.status(404).json({
          error: 'No data available for this IP',
          message: 'No results returned from DataZapp'
        });
      }

      console.log('📊 Enriched data found');
      return res.json(result);
    } else {
      console.log('⚠️ Empty response from DataZapp');
      return res.status(404).json({
        error: 'No data available for this IP',
        message: 'Empty response from DataZapp'
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      return res.status(error.response.status).json({
        error: 'DataZapp API error',
        details: error.response.data
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 DataZapp Proxy Server running on port ${PORT}`);
  console.log(`📡 DataZapp API URL: ${DATAZAPP_API_URL}`);
  console.log(`🔑 API Key configured: ${!!DATAZAPP_API_KEY}`);
  console.log(`🔐 Proxy API Key configured: ${!!PROXY_API_KEY}`);
});
