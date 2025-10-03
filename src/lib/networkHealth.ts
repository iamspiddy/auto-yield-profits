import { supabase } from '@/integrations/supabase/client';

export interface NetworkHealthStatus {
  isHealthy: boolean;
  latency: number;
  error?: string;
  timestamp: string;
}

export class NetworkHealthService {
  // Check if Supabase connection is healthy
  static async checkSupabaseHealth(): Promise<NetworkHealthStatus> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    try {
      // Try a simple query to test connection
      const { data, error } = await supabase
        .from('investment_plans')
        .select('id')
        .limit(1);
      
      const latency = Date.now() - startTime;
      
      if (error) {
        return {
          isHealthy: false,
          latency,
          error: error.message,
          timestamp
        };
      }
      
      return {
        isHealthy: true,
        latency,
        timestamp
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        isHealthy: false,
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp
      };
    }
  }
  
  // Check if the Supabase URL is reachable
  static async checkSupabaseURL(): Promise<boolean> {
    try {
      const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZXBocWptcnBydHlsdnVxbWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzAyNjQsImV4cCI6MjA2OTMwNjI2NH0.0Hef7vRX_CXzUF2aHwzSs7XKGE6k3sL9KRU9n6mcPnQ";
      
      const response = await fetch('https://kyephqjmrprtylvuqmef.supabase.co/rest/v1/', {
        method: 'HEAD',
        headers: {
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Supabase URL check failed:', error);
      return false;
    }
  }
  
  // Get comprehensive network diagnostics
  static async getNetworkDiagnostics(): Promise<{
    supabaseHealth: NetworkHealthStatus;
    urlReachable: boolean;
    userAgent: string;
    online: boolean;
  }> {
    const supabaseHealth = await this.checkSupabaseHealth();
    const urlReachable = await this.checkSupabaseURL();
    
    return {
      supabaseHealth,
      urlReachable,
      userAgent: navigator.userAgent,
      online: navigator.onLine
    };
  }
  
  // Log network diagnostics to console
  static async logNetworkDiagnostics(): Promise<void> {
    console.group('🌐 Network Diagnostics');
    
    const diagnostics = await this.getNetworkDiagnostics();
    
    console.log('📡 Supabase Health:', diagnostics.supabaseHealth);
    console.log('🔗 URL Reachable:', diagnostics.urlReachable);
    console.log('🌍 Online Status:', diagnostics.online);
    console.log('🖥️ User Agent:', diagnostics.userAgent);
    
    if (!diagnostics.supabaseHealth.isHealthy) {
      console.warn('⚠️ Supabase connection issues detected');
      console.warn('Error:', diagnostics.supabaseHealth.error);
    }
    
    if (!diagnostics.urlReachable) {
      console.warn('⚠️ Supabase URL is not reachable');
    }
    
    if (!diagnostics.online) {
      console.warn('⚠️ Browser is offline');
    }
    
    console.groupEnd();
  }
}
