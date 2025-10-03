// Simple utility to test Supabase connection
// This can be called from the browser console for debugging

export const testSupabaseConnection = async () => {
  console.log('🧪 Testing Supabase connection...');
  
  try {
    // Test 1: Basic fetch to Supabase URL
    const SUPABASE_URL = "https://kyephqjmrprtylvuqmef.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZXBocWptcnBydHlsdnVxbWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzAyNjQsImV4cCI6MjA2OTMwNjI2NH0.0Hef7vRX_CXzUF2aHwzSs7XKGE6k3sL9KRU9n6mcPnQ";
    
    console.log('📡 Testing basic URL reachability...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ URL reachable:', response.ok, 'Status:', response.status);
    
    // Test 2: Try a simple query
    console.log('📊 Testing database query...');
    const queryResponse = await fetch(`${SUPABASE_URL}/rest/v1/investment_plans?select=id&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Query response:', queryResponse.ok, 'Status:', queryResponse.status);
    
    if (!queryResponse.ok) {
      const errorText = await queryResponse.text();
      console.error('❌ Query error:', errorText);
    }
    
    return {
      urlReachable: response.ok,
      queryWorking: queryResponse.ok,
      urlStatus: response.status,
      queryStatus: queryResponse.status
    };
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return {
      urlReachable: false,
      queryWorking: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testSupabaseConnection = testSupabaseConnection;
}
