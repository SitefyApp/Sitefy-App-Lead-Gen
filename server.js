const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Reverse IP Append endpoint
app.post('/api/reverse-ip-append', async (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    console.log('🔍 Processing IP:', ip);

    // Get credentials from environment
    const username = process.env.DATAZAPP_USER;
    const password = process.env.DATAZAPP_PASSWORD;
    const apiKey = process.env.DATAZAPP_API_KEY;

    if (!username || !password || !apiKey) {
      console.error('❌ Missing DataZapp credentials');
      return res.status(500).json({ error: 'DataZapp credentials not configured' });
    }

    console.log('🔑 Using credentials:', { username, apiKey: apiKey.substring(0, 10) + '...' });

    // Prepare request to DataZapp
    const ipAddresses = [ip];
    
    const requestBody = {
      Username: username,
      Password: password,
      ApiKey: apiKey,
      AppendType: 4, // Advanced IP Append
      Data: ipAddresses.map(ip => ({ IP: ip }))
    };

    console.log('📡 Calling DataZapp API with AppendType 4 (Advanced)...');
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    // Call DataZapp API
    const response = await axios.post(
      'https://api.datazapp.com/api/DataAppend',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      }
    );

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
    console.error('❌ Error calling DataZapp:', error.response?.data || error.message);
    
    if (error.response) {
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

// Test endpoint
app.post('/api/test', async (req, res) => {
  try {
    const username = process.env.DATAZAPP_USER;
    const password = process.env.DATAZAPP_PASSWORD;
    const apiKey = process.env.DATAZAPP_API_KEY;

    if (!username || !password || !apiKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'Missing credentials',
        hasUsername: !!username,
        hasPassword: !!password,
        hasApiKey: !!apiKey
      });
    }

    const requestBody = {
      Username: username,
      Password: password,
      ApiKey: apiKey,
      AppendType: 4, // Advanced IP Append
      Data: [{ IP: '8.8.8.8' }]
    };

    console.log('Testing DataZapp with AppendType 4...');

    const response = await axios.post(
      'https://api.datazapp.com/api/DataAppend',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      }
    );

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('Test error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 DataZapp Proxy running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 Reverse IP Append: POST http://localhost:${PORT}/api/reverse-ip-append`);
  console.log(`📍 Test endpoint: POST http://localhost:${PORT}/api/test`);
});
