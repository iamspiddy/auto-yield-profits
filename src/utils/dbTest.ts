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
    const tables = ['profiles', 'deposits', 'withdrawals', 'referrals', 'earnings', 'transactions'];
    
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

/**
 * Test if there's any data in the database
 */
export const testDatabaseData = async () => {
  try {
    console.log('Testing database data...');
    
    // Test profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, email, full_name, role')
      .limit(5);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    } else {
      console.log('Profiles found:', profiles?.length || 0);
      console.log('Sample profiles:', profiles);
    }

    // Test deposits table
    const { data: deposits, error: depositsError } = await supabase
      .from('deposits')
      .select('*')
      .limit(5);

    if (depositsError) {
      console.error('Error fetching deposits:', depositsError);
    } else {
      console.log('Deposits found:', deposits?.length || 0);
      console.log('Sample deposits:', deposits);
    }

    // Test withdrawals table
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from('withdrawals')
      .select('*')
      .limit(5);

    if (withdrawalsError) {
      console.error('Error fetching withdrawals:', withdrawalsError);
    } else {
      console.log('Withdrawals found:', withdrawals?.length || 0);
      console.log('Sample withdrawals:', withdrawals);
    }

    return {
      profiles: profiles?.length || 0,
      deposits: deposits?.length || 0,
      withdrawals: withdrawals?.length || 0,
      sampleProfiles: profiles,
      sampleDeposits: deposits,
      sampleWithdrawals: withdrawals
    };
  } catch (error) {
    console.error('Error testing database data:', error);
    return null;
  }
}; 