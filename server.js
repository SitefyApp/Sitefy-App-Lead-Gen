require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables
const DATAZAPP_API_KEY = process.env.DATAZAPP_API_KEY;
const DATAZAPP_API_URL = process.env.DATAZAPP_API_URL || 'https://secureapi.datazapp.com/Appendv2';
const PROXY_API_KEY = process.env.PROXY_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

// API Key authentication middleware
const authenticateApiKey = (req, res, next) => {
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
    environment: {
      hasDataZappKey: !!DATAZAPP_API_KEY,
      hasProxyKey: !!PROXY_API_KEY,
      datazappUrl: DATAZAPP_API_URL
    }
  });
});

// Test endpoint for DataZapp API
app.post('/api/test', authenticateApiKey, async (req, res) => {
  try {
    console.log('🧪 Test endpoint called');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    
    const { ipAddress } = req.body;
    
    if (!ipAddress) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    console.log('🔍 Testing IP:', ipAddress);
    console.log('🔑 Using API Key:', DATAZAPP_API_KEY ? `${DATAZAPP_API_KEY.substring(0, 4)}...${DATAZAPP_API_KEY.slice(-4)}` : 'MISSING');
    console.log('🌐 API URL:', DATAZAPP_API_URL);

    // DataZapp v2 API format
    const requestBody = {
      ApiKey: DATAZAPP_API_KEY,
      AppendModule: 'ReverseIPAppend',
      AppendType: 2,  // Changed to AppendType 2
      Data: [
        {
          IP: ipAddress
        }
      ]
    };

    console.log('📤 Sending to DataZapp:', JSON.stringify(requestBody, null, 2));

    const response = await axios.post(DATAZAPP_API_URL, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    console.log('📊 DataZapp raw response:', JSON.stringify(response.data, null, 2));
    console.log('📊 Response is array:', Array.isArray(response.data));
    console.log('📊 Response length:', response.data?.length);
    
    if (response.data && response.data.length > 0) {
      console.log('📊 First result:', JSON.stringify(response.data[0], null, 2));
    }

    console.log('✅ DataZapp response status:', response.status);

    // Handle v2 array response
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const result = response.data[0];
      
      console.log('✅ Test successful - returning data');
      return res.json({
        success: true,
        data: result,
        raw: response.data
      });
    } else {
      console.log('⚠️ Empty response from DataZapp');
      return res.json({
        success: false,
        message: 'No data available for this IP',
        raw: response.data
      });
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    if (error.response) {
      console.error('📄 Error response:', JSON.stringify(error.response.data, null, 2));
      console.error('📟 Error status:', error.response.status);
    }
    
    res.status(500).json({ 
      error: 'Test failed',
      message: error.message,
      details: error.response?.data
    });
  }
});

// Main reverse IP append endpoint
app.post('/api/reverse-ip-append', authenticateApiKey, async (req, res) => {
  try {
    console.log('🚀 Reverse IP Append called');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    
    const { ipAddresses } = req.body;
    
    if (!ipAddresses || !Array.isArray(ipAddresses) || ipAddresses.length === 0) {
      return res.status(400).json({ error: 'Invalid or missing ipAddresses array' });
    }

    const ipAddress = ipAddresses[0];
    console.log('🔍 Processing IP:', ipAddress);

    // DataZapp v2 API format
    const requestBody = {
      ApiKey: DATAZAPP_API_KEY,
      AppendModule: 'ReverseIPAppend',
      AppendType: 2,  // Changed to AppendType 2
      Data: [
        {
          IP: ipAddress
        }
      ]
    };

    console.log('📤 Calling DataZapp API...');
    
    const response = await axios.post(DATAZAPP_API_URL, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    console.log('📊 DataZapp raw response:', JSON.stringify(response.data, null, 2));
    console.log('📊 Response is array:', Array.isArray(response.data));
    console.log('📊 Response length:', response.data?.length);
    
    if (response.data && response.data.length > 0) {
      console.log('📊 First result:', JSON.stringify(response.data[0], null, 2));
    }

    console.log('✅ DataZapp API response status:', response.status);

    // Handle v2 array response
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const result = response.data[0];
      
      // Check if we actually got data
      if (result && Object.keys(result).length > 1) { // More than just IP field
        console.log('✅ Valid data received, returning result');
        return res.json(result);
      } else {
        console.log('⚠️ Empty result object from DataZapp');
        return res.status(404).json({
          error: 'No data available for this IP',
          message: 'Empty response from DataZapp'
        });
      }
    } else {
      console.log('⚠️ Empty or invalid response array from DataZapp');
      return res.status(404).json({
        error: 'No data available for this IP',
        message: 'Empty response from DataZapp'
      });
    }

  } catch (error) {
    console.error('❌ Error calling DataZapp:', error.message);
    
    if (error.response) {
      console.error('📄 DataZapp error response:', JSON.stringify(error.response.data, null, 2));
      console.error('📟 Status:', error.response.status);
      
      return res.status(error.response.status).json({
        error: 'DataZapp API error',
        message: error.response.data,
        status: error.response.status
      });
    }
    
    res.status(500).json({ 
      error: 'Internal proxy error',
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 DataZapp Proxy running on port ${PORT}`);
  console.log(`🔑 DataZapp API Key configured: ${!!DATAZAPP_API_KEY}`);
  console.log(`🔑 Proxy API Key configured: ${!!PROXY_API_KEY}`);
  console.log(`🌐 DataZapp URL: ${DATAZAPP_API_URL}`);
});
