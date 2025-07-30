import { supabase } from '@/integrations/supabase/client';

/**
 * Test database connectivity and table access
 * This function helps debug database connection issues
 */
export const testDatabaseConnection = async () => {
  const results = {
    connection: false,
    tables: {} as Record<string, boolean>,
    errors: [] as string[]
  };

  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      results.errors.push(`Connection error: ${error.message}`);
    } else {
      results.connection = true;
    }

    // Test each table
    const tables = ['profiles', 'deposits', 'withdrawals', 'referrals', 'admin_actions', 'earnings', 'transactions'];
    
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (tableError) {
          results.tables[table] = false;
          results.errors.push(`${table} table error: ${tableError.message}`);
        } else {
          results.tables[table] = true;
        }
      } catch (err: any) {
        results.tables[table] = false;
        results.errors.push(`${table} table error: ${err.message}`);
      }
    }

    console.log('Database Test Results:', results);
    return results;
  } catch (error: any) {
    results.errors.push(`General error: ${error.message}`);
    console.error('Database test failed:', error);
    return results;
  }
};

/**
 * Get basic stats for debugging
 */
export const getBasicStats = async () => {
  try {
    const stats = {
      profiles: 0,
      deposits: 0,
      withdrawals: 0,
      referrals: 0,
      admin_actions: 0,
      earnings: 0,
      transactions: 0
    };

    // Get counts for each table
    const tables = Object.keys(stats) as (keyof typeof stats)[];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.error(`Error counting ${table}:`, error);
        } else {
          stats[table] = count || 0;
        }
      } catch (err) {
        console.error(`Error accessing ${table}:`, err);
      }
    }

    console.log('Basic Stats:', stats);
    return stats;
  } catch (error) {
    console.error('Error getting basic stats:', error);
    return null;
  }
}; 