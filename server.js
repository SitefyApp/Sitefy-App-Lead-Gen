const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'DataZapp Proxy Server Running',
    endpoints: {
      reverseIpAppend: '/api/reverse-ip-append',
      test: '/api/test'
    }
  });
});

// Reverse IP Append endpoint
app.post('/api/reverse-ip-append', async (req, res) => {
  try {
    const { ip } = req.body;
    const datazappKey = process.env.DATAZAPP_API_KEY;

    if (!datazappKey) {
      console.error('❌ DATAZAPP_API_KEY not configured');
      return res.status(500).json({ error: 'DataZapp API key not configured' });
    }

    if (!ip) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    console.log(`🔍 Processing IP: ${ip}`);

    // Call DataZapp v2 API with AppendType 2
    const datazappResponse = await axios.post(
      'https://secureapi.datazapp.com/Appendv2',
      {
        APIKey: datazappKey,
        AppendType: 2,
        Records: [
          {
            IPAddress: ip
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('📦 Full DataZapp Response Status:', datazappResponse.status);
    console.log('📦 Response Structure:', JSON.stringify(datazappResponse.data, null, 2));

    // Access nested contact data from ResponseDetail.Data[0]
    const contactData = datazappResponse.data?.ResponseDetail?.Data?.[0];
    
    if (!contactData) {
      console.log('⚠️ No contact data found in response');
      return res.status(404).json({ 
        error: 'No data available for this IP',
        message: 'Empty response from DataZapp'
      });
    }

    console.log('📋 Contact Data Found:', JSON.stringify(contactData, null, 2));

    // Check if we have personal contact information (not just IP location data)
    const hasPersonalData = contactData.FirstName || 
                           contactData.LastName || 
                           contactData.Email || 
                           contactData.Cell || 
                           contactData.Phone;

    if (!hasPersonalData) {
      console.log('⚠️ Only IP location data available, no personal contact info');
      return res.status(404).json({ 
        error: 'No personal contact data available for this IP',
        message: 'Only IP location data found',
        location: {
          city: contactData.IPCity || contactData.City,
          state: contactData.IPState || contactData.State,
          country: contactData.IPCountry || contactData.Country
        }
      });
    }

    // Map DataZapp fields to expected format
    const mappedData = {
      // Personal Information
      FirstName: contactData.FirstName || contactData.DataZapp_First || null,
      LastName: contactData.LastName || contactData.DataZapp_Last || null,
      Email: contactData.Email || contactData.DataZapp_Email || null,
      Phone: contactData.Cell || contactData.Phone || contactData.DataZapp_Cell || null,
      
      // Address Information
      Address: contactData.Address || contactData.DataZapp_Address || null,
      Address2: contactData.Address2 || contactData.DataZapp_Address2 || null,
      City: contactData.City || contactData.DataZapp_City || contactData.IPCity || null,
      State: contactData.State || contactData.DataZapp_State || contactData.IPState || null,
      Country: contactData.Country || contactData.DataZapp_Country || contactData.IPCountry || null,
      ZipCode: contactData.ZipCode || contactData.Zipcode || contactData.DataZapp_Zipcode || null,
      
      // Address Metadata
      AddressStatus: contactData.AddressStatus || contactData.DataZapp_AddressStatus || null,
      AddressType: contactData.AddressType || contactData.DataZapp_AddressType || null,
      ResidentialAddressFlag: contactData.ResidentialAddressFlag || contactData.DataZapp_ResidentialAddressFlag || null,
      
      // IP Information
      IPAddress: contactData.IPAddress || ip,
      IPCity: contactData.IPCity || null,
      IPState: contactData.IPState || null,
      IPCountry: contactData.IPCountry || null,
      IPLatitude: contactData.IPLatitude || null,
      IPLongitude: contactData.IPLongitude || null,
      ISP: contactData.Organization || contactData.ISP || null,
      
      // Confidence Score
      Confidence: contactData.confidence || contactData.Confidence || null,
      
      // Raw response for debugging
      _rawResponse: contactData
    };

    console.log('✅ Successfully mapped contact data');
    console.log('📧 Email:', mappedData.Email);
    console.log('👤 Name:', `${mappedData.FirstName} ${mappedData.LastName}`);
    console.log('📞 Phone:', mappedData.Phone);
    console.log('🎯 Confidence:', mappedData.Confidence);

    return res.json(mappedData);

  } catch (error) {
    console.error('❌ DataZapp API Error:', error.response?.status, error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        error: 'No data available for this IP',
        message: error.response?.data?.message || 'Empty response from DataZapp'
      });
    }
    
    return res.status(error.response?.status || 500).json({ 
      error: 'DataZapp API error',
      message: error.message,
      details: error.response?.data
    });
  }
});

// Test endpoint with known good IP
app.get('/api/test', async (req, res) => {
  try {
    const testIP = req.query.ip || '72.186.103.112'; // IP from CSV with known data
    const datazappKey = process.env.DATAZAPP_API_KEY;

    console.log(`🧪 Testing with IP: ${testIP}`);

    const datazappResponse = await axios.post(
      'https://secureapi.datazapp.com/Appendv2',
      {
        APIKey: datazappKey,
        AppendType: 2,
        Records: [{ IPAddress: testIP }]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    console.log('📦 Full Test Response:', JSON.stringify(datazappResponse.data, null, 2));

    const contactData = datazappResponse.data?.ResponseDetail?.Data?.[0];

    return res.json({
      testIP,
      fullResponse: datazappResponse.data,
      contactData: contactData,
      hasPersonalData: !!(contactData?.FirstName || contactData?.Email || contactData?.Cell)
    });

  } catch (error) {
    console.error('❌ Test Error:', error.response?.data || error.message);
    return res.status(500).json({ 
      error: 'Test failed',
      message: error.message,
      details: error.response?.data
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 DataZapp Proxy Server running on port ${PORT}`);
  console.log(`🔑 API Key configured: ${process.env.DATAZAPP_API_KEY ? 'Yes' : 'No'}`);
});
