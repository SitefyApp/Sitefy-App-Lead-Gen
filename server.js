const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CRITICAL: Add body parser middleware
app.use(express.json());
app.use(cors());

// DataZapp API Configuration
const DATAZAPP_API_URL = 'https://api.datazapp.com/PublicService.svc';
const DATAZAPP_USER = process.env.DATAZAPP_USER;
const DATAZAPP_PASSWORD = process.env.DATAZAPP_PASSWORD;

// Validate API key middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.API_KEY;
  
  if (!expectedKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test endpoint
app.get('/api/test', async (req, res) => {
  try {
    const testIp = req.query.ip || '72.186.103.112'; // Known good IP from user's CSV
    
    console.log('🧪 Test endpoint called with IP:', testIp);
    
    const result = await enrichIpWithDataZapp(testIp);
    
    res.json({
      success: true,
      testIp,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Main enrichment endpoint
app.post('/api/reverse-ip-append', validateApiKey, async (req, res) => {
  try {
    console.log('📨 Request received:', JSON.stringify(req.body));
    
    // Handle both ipAddresses (array) and ip (single) formats
    const ips = req.body.ipAddresses || (req.body.ip ? [req.body.ip] : []);
    
    if (!ips || ips.length === 0) {
      console.error('❌ No IP addresses provided in request');
      return res.status(400).json({ 
        error: 'IP address is required',
        received: req.body 
      });
    }

    const ip = ips[0]; // Process first IP
    console.log('🔍 Processing IP:', ip);

    if (!DATAZAPP_USER || !DATAZAPP_PASSWORD) {
      throw new Error('DataZapp credentials not configured');
    }

    const result = await enrichIpWithDataZapp(ip);
    
    res.json(result);

  } catch (error) {
    console.error('❌ Reverse IP append error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// DataZapp enrichment function
async function enrichIpWithDataZapp(ip) {
  console.log('📡 Calling DataZapp API for IP:', ip);
  
  const requestBody = {
    User: DATAZAPP_USER,
    Password: DATAZAPP_PASSWORD,
    AppendType: 2,
    IPAddress: ip
  };

  console.log('📤 DataZapp request:', JSON.stringify({ ...requestBody, Password: '***' }));

  const response = await axios.post(
    `${DATAZAPP_API_URL}/ReverseIPAppend`,
    requestBody,
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    }
  );

  console.log('📥 DataZapp raw response status:', response.status);
  console.log('📥 DataZapp response structure:', JSON.stringify(response.data, null, 2));

  // Access the nested contact data from DataZapp v2 API
  const contactData = response.data?.ResponseDetail?.Data?.[0];
  
  if (!contactData) {
    console.log('⚠️ No contact data in response');
    return {
      error: 'No data available for this IP',
      message: 'Empty response from DataZapp'
    };
  }

  console.log('📊 Contact data found:', JSON.stringify({
    hasName: !!(contactData.FirstName || contactData.LastName),
    hasEmail: !!contactData.Email,
    hasPhone: !!(contactData.Cell || contactData.Phone),
    hasAddress: !!contactData.Address
  }));

  // Check if we have personal contact data (not just location)
  const hasPersonalData = contactData.FirstName || contactData.LastName || 
                          contactData.Email || contactData.Cell || contactData.Phone;
  
  if (!hasPersonalData) {
    console.log('⚠️ Only location data available, no personal contact info');
    return {
      error: 'No personal contact data available',
      message: 'Only IP location data found'
    };
  }

  // Map DataZapp fields to expected format
  const mappedData = {
    FirstName: contactData.FirstName || null,
    LastName: contactData.LastName || null,
    Email: contactData.Email || null,
    Phone: contactData.Cell || contactData.Phone || null,
    Cell: contactData.Cell || null,
    Address: contactData.Address || null,
    Address2: contactData.Address2 || null,
    City: contactData.City || null,
    State: contactData.State || null,
    Country: contactData.Country || null,
    ZipCode: contactData.ZipCode || null,
    AddressStatus: contactData.AddressStatus || null,
    AddressType: contactData.AddressType || null,
    ResidentialAddressFlag: contactData.ResidentialAddressFlag || null,
    confidence: contactData.confidence || 85,
    Cell_DNC: contactData.Cell_DNC || false,
    Phone_DNC: contactData.Phone_DNC || false,
    // IP-related fields
    IPAddress: contactData.IPAddress || ip,
    IPCity: contactData.IPCity || null,
    IPState: contactData.IPState || null,
    IPZipCode: contactData.IPZipCode || null,
    IPCountry: contactData.IPCountry || null
  };

  console.log('✅ Successfully mapped DataZapp response');
  
  return mappedData;
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('💥 Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 DataZapp Proxy Server running on port ${PORT}`);
  console.log(`🔑 DataZapp User: ${DATAZAPP_USER ? 'Configured' : 'Missing'}`);
  console.log(`🔑 DataZapp Password: ${DATAZAPP_PASSWORD ? 'Configured' : 'Missing'}`);
});
