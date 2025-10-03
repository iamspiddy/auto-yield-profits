import { supabase } from '@/integrations/supabase/client';

export class SupabaseTest {
  // Test basic Supabase connection
  static async testConnection(): Promise<{
    success: boolean;
    error?: string;
    latency?: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Test with a simple query that should work
      const { data, error } = await supabase
        .from('investment_plans')
        .select('id')
        .limit(1);
      
      const latency = Date.now() - startTime;
      
      if (error) {
        return {
          success: false,
          error: error.message,
          latency
        };
      }
      
      return {
        success: true,
        latency
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency
      };
    }
  }
  
  // Test authentication
  static async testAuth(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Run all tests
  static async runAllTests(): Promise<{
    connection: { success: boolean; error?: string; latency?: number };
    auth: { success: boolean; error?: string };
  }> {
    console.log('🧪 Running Supabase tests...');
    
    const connection = await this.testConnection();
    const auth = await this.testAuth();
    
    console.log('📡 Connection test:', connection);
    console.log('🔐 Auth test:', auth);
    
    return { connection, auth };
  }
}
