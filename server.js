const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// API key validation middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.PROXY_API_KEY) {
    console.log('❌ Invalid or missing API key');
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  
  console.log('✅ API key validated');
  next();
};

// DataZapp API configuration
const DATAZAPP_API_URL = 'https://www.datazapp.com/api/2024/06/25/reverse-ip-append-api/';

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test endpoint for DataZapp connectivity
app.post('/api/test', validateApiKey, async (req, res) => {
  try {
    console.log('🧪 Testing DataZapp API connection...');
    
    const response = await axios.post(DATAZAPP_API_URL, {
      User: process.env.DATAZAPP_USER,
      Password: process.env.DATAZAPP_PASSWORD,
      AppendType: 1, // Advanced IP Append
      IP: '8.8.8.8' // Google DNS for testing
    });

    console.log('✅ DataZapp test successful');
    res.json({
      success: true,
      message: 'DataZapp API connection successful',
      data: response.data
    });
  } catch (error) {
    console.error('❌ DataZapp test failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

// Reverse IP Append endpoint
app.post('/api/reverse-ip-append', validateApiKey, async (req, res) => {
  try {
    console.log('📥 Received request body:', JSON.stringify(req.body));
    
    // Extract IP from ipAddresses array
    const ipAddresses = req.body.ipAddresses;
    
    if (!ipAddresses || !Array.isArray(ipAddresses) || ipAddresses.length === 0) {
      console.log('❌ Missing or invalid ipAddresses');
      return res.status(400).json({ error: 'IP address is required' });
    }

    // Get first IP from array
    const ipAddress = ipAddresses[0];
    console.log('🔍 Processing IP:', ipAddress);

    // Validate credentials
    if (!process.env.DATAZAPP_USER || !process.env.DATAZAPP_PASSWORD) {
      console.error('❌ DataZapp credentials not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    console.log('🔑 Using DataZapp credentials:', {
      user: process.env.DATAZAPP_USER,
      hasPassword: !!process.env.DATAZAPP_PASSWORD
    });

    // Call DataZapp API with correct parameter name (IP)
    console.log('📡 Calling DataZapp API...');
    const response = await axios.post(DATAZAPP_API_URL, {
      User: process.env.DATAZAPP_USER,
      Password: process.env.DATAZAPP_PASSWORD,
      AppendType: 1, // Advanced IP Append
      IP: ipAddress  // Correct parameter name per DataZapp docs
    });

    console.log('✅ DataZapp full response:', JSON.stringify(response.data, null, 2));
    
    const datazappResponse = response.data;
    
    // Extract the person data from the Data array
    if (!datazappResponse.Data || !Array.isArray(datazappResponse.Data) || datazappResponse.Data.length === 0) {
      console.log('⚠️ No person data in DataZapp response');
      return res.status(404).json({
        error: 'No data available for this IP',
        details: {
          count: datazappResponse.Count,
          processedTime: datazappResponse.ProcessedTime
        }
      });
    }

    // Return just the person data (first element)
    const personData = datazappResponse.Data[0];
    console.log('✅ Extracted person data:', JSON.stringify(personData, null, 2));
    
    return res.json(personData);

  } catch (error) {
    console.error('❌ Error processing request:', error.message);
    
    if (error.response) {
      console.error('❌ DataZapp API error response:', {
        status: error.response.status,
        data: error.response.data
      });
      
      return res.status(error.response.status).json({
        error: error.response.data?.message || 'DataZapp API error',
        details: error.response.data
      });
    }
    
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 DataZapp Proxy Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
