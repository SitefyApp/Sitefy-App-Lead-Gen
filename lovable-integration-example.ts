// Example Lovable Cloud Backend Function
// Add this to your Lovable project's backend functions

/**
 * Enrich IP addresses using DataZapp through proxy
 * @param ipAddresses - Array of IP addresses to enrich
 * @returns Enriched contact data
 */
export async function enrichIPAddresses(ipAddresses: string[]) {
  const proxyUrl = process.env.DATAZAPP_PROXY_URL; // e.g., https://your-app.railway.app
  const apiKey = process.env.DATAZAPP_PROXY_KEY;
  
  if (!proxyUrl || !apiKey) {
    throw new Error('DataZapp proxy not configured');
  }
  
  try {
    const response = await fetch(`${proxyUrl}/api/reverse-ip-append`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        ipAddresses: ipAddresses
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`DataZapp API error: ${error.error}`);
    }
    
    const result = await response.json();
    return result.data;
    
  } catch (error) {
    console.error('Failed to enrich IP addresses:', error);
    throw error;
  }
}

/**
 * Enrich single IP address (wrapper for convenience)
 */
export async function enrichSingleIP(ipAddress: string) {
  const result = await enrichIPAddresses([ipAddress]);
  return result.ResponseDetail?.Data?.[0] || null;
}

/**
 * Example: Track website visitor and enrich
 */
export async function trackAndEnrichVisitor(visitorIP: string, userId: string) {
  try {
    // Enrich IP with DataZapp
    const enrichedData = await enrichSingleIP(visitorIP);
    
    if (!enrichedData || !enrichedData.Email) {
      console.log('No contact data found for IP:', visitorIP);
      return null;
    }
    
    // Store in your database
    const visitorData = {
      userId: userId,
      ip: visitorIP,
      firstName: enrichedData.FirstName,
      lastName: enrichedData.LastName,
      email: enrichedData.Email,
      phone: enrichedData.Phone,
      cell: enrichedData.Cell,
      address: enrichedData.Address,
      city: enrichedData.City,
      state: enrichedData.State,
      zipCode: enrichedData.ZipCode,
      cellDNC: enrichedData.Cell_DNC, // Do Not Call flag
      phoneDNC: enrichedData.Phone_DNC,
      isp: enrichedData.ISP,
      organization: enrichedData.Organization,
      enrichedAt: new Date().toISOString()
    };
    
    // Save to your database here
    // await db.visitors.create(visitorData);
    
    return visitorData;
    
  } catch (error) {
    console.error('Failed to track visitor:', error);
    return null;
  }
}

/**
 * Example: Batch enrich IPs with credit deduction
 */
export async function batchEnrichWithCredits(
  ipAddresses: string[], 
  userId: string,
  creditCost: number = 0.10 // Your markup price per IP
) {
  // Check user has enough credits
  const userCredits = await getUserCredits(userId);
  const totalCost = ipAddresses.length * creditCost;
  
  if (userCredits < totalCost) {
    throw new Error(`Insufficient credits. Need ${totalCost}, have ${userCredits}`);
  }
  
  try {
    // Call DataZapp through proxy
    const enrichedData = await enrichIPAddresses(ipAddresses);
    
    // Deduct credits (your actual cost is ~$0.03 per match)
    await deductCredits(userId, totalCost);
    
    // Log transaction for profit tracking
    await logTransaction({
      userId,
      type: 'ip_enrichment',
      quantity: ipAddresses.length,
      cost: ipAddresses.length * 0.03, // Your cost
      revenue: totalCost, // What you charged
      profit: totalCost - (ipAddresses.length * 0.03)
    });
    
    return enrichedData;
    
  } catch (error) {
    console.error('Batch enrichment failed:', error);
    throw error;
  }
}

/**
 * Placeholder functions - implement based on your database
 */
async function getUserCredits(userId: string): Promise<number> {
  // TODO: Fetch from your database
  return 100.0;
}

async function deductCredits(userId: string, amount: number): Promise<void> {
  // TODO: Update database
  console.log(`Deducting ${amount} credits from user ${userId}`);
}

async function logTransaction(transaction: any): Promise<void> {
  // TODO: Log to database for analytics
  console.log('Transaction logged:', transaction);
}

/**
 * Example API route for frontend to call
 */
export async function handleEnrichIPRequest(request: {
  ipAddresses: string[];
  userId: string;
}) {
  const { ipAddresses, userId } = request;
  
  // Validate input
  if (!Array.isArray(ipAddresses) || ipAddresses.length === 0) {
    return {
      success: false,
      error: 'Invalid IP addresses provided'
    };
  }
  
  try {
    const result = await batchEnrichWithCredits(ipAddresses, userId, 0.10);
    
    return {
      success: true,
      data: result,
      creditsUsed: ipAddresses.length * 0.10
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Example: Frontend React component usage
/*
import { useState } from 'react';

function IPEnrichmentTool() {
  const [ipAddress, setIpAddress] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const handleEnrich = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/enrich-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ipAddresses: [ipAddress],
          userId: 'current-user-id' // Get from auth
        })
      });
      
      const data = await response.json();
      setResult(data);
      
    } catch (error) {
      console.error('Enrichment failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <input 
        value={ipAddress}
        onChange={(e) => setIpAddress(e.target.value)}
        placeholder="Enter IP address"
      />
      <button onClick={handleEnrich} disabled={loading}>
        {loading ? 'Enriching...' : 'Enrich IP'}
      </button>
      
      {result && (
        <div>
          <h3>Results:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
*/
