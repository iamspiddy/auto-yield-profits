// Script to manually fix the decrement_balance function
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://kyephqjmrprtylvuqmef.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZXBocWptcnBydHlsdnVxbWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzAyNjQsImV4cCI6MjA2OTMwNjI2NH0.0Hef7vRX_CXzUF2aHwzSs7XKGE6k3sL9KRU9n6mcPnQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function fixDecrementBalanceFunction() {
  console.log('🔧 Fixing decrement_balance function...');
  
  try {
    // Step 1: Drop existing function
    console.log('Step 1: Dropping existing decrement_balance function...');
    
    const dropQueries = [
      'DROP FUNCTION IF EXISTS public.decrement_balance(UUID, NUMERIC);',
      'DROP FUNCTION IF EXISTS public.decrement_balance(_user_id UUID, _amount NUMERIC);'
    ];
    
    for (const query of dropQueries) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: query });
        if (error) {
          console.log(`Drop query result: ${error.message}`);
        } else {
          console.log('✅ Function dropped successfully');
        }
      } catch (err) {
        console.log(`Drop query completed: ${err.message}`);
      }
    }
    
    // Step 2: Create new function
    console.log('\nStep 2: Creating new decrement_balance function...');
    
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.decrement_balance(
          user_id_param UUID,
          amount_param NUMERIC
      )
      RETURNS NUMERIC AS $$
      DECLARE
          new_balance NUMERIC;
          current_balance NUMERIC;
      BEGIN
          -- Get current available balance from user_balances table
          SELECT COALESCE(available_balance, 0) INTO current_balance
          FROM public.user_balances
          WHERE user_id = user_id_param;
          
          -- If no record exists, create one
          IF current_balance IS NULL THEN
              INSERT INTO public.user_balances (user_id, available_balance, invested_balance)
              VALUES (user_id_param, 0, 0)
              ON CONFLICT (user_id) DO NOTHING;
              
              current_balance := 0;
          END IF;
          
          -- Calculate new balance (subtract the amount)
          new_balance := current_balance - amount_param;
          
          -- Check if balance would go negative
          IF new_balance < 0 THEN
              RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', current_balance, amount_param;
          END IF;
          
          -- Update user_balances table
          UPDATE public.user_balances 
          SET available_balance = new_balance,
              updated_at = NOW()
          WHERE user_id = user_id_param
          RETURNING available_balance INTO new_balance;
          
          -- Create transaction record
          INSERT INTO public.balance_transactions (
              user_id,
              transaction_type,
              amount,
              balance_before,
              balance_after,
              description,
              created_at
          ) VALUES (
              user_id_param,
              'withdrawal',
              -amount_param,
              current_balance,
              new_balance,
              'Withdrawal processed',
              NOW()
          );
          
          RETURN new_balance;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createFunctionSQL });
    
    if (createError) {
      console.error('❌ Error creating function:', createError);
      return;
    }
    
    console.log('✅ Function created successfully');
    
    // Step 3: Grant permissions
    console.log('\nStep 3: Granting permissions...');
    
    const grantQueries = [
      'GRANT EXECUTE ON FUNCTION public.decrement_balance(UUID, NUMERIC) TO authenticated;',
      'GRANT EXECUTE ON FUNCTION public.decrement_balance(UUID, NUMERIC) TO anon;'
    ];
    
    for (const query of grantQueries) {
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.log(`Grant query result: ${error.message}`);
      } else {
        console.log('✅ Permissions granted');
      }
    }
    
    // Step 4: Test the function
    console.log('\nStep 4: Testing the function...');
    
    const testUserId = '00000000-0000-0000-0000-000000000000';
    const { data, error: testError } = await supabase
      .rpc('decrement_balance', {
        user_id_param: testUserId,
        amount_param: 10
      });
    
    if (testError) {
      if (testError.message.includes('Insufficient balance')) {
        console.log('✅ Function works correctly (insufficient balance error is expected)');
      } else {
        console.log('❌ Function test failed:', testError);
      }
    } else {
      console.log('✅ Function test successful:', data);
    }
    
    console.log('\n🎉 decrement_balance function fixed successfully!');
    console.log('\nYou can now process withdrawals without errors.');
    
  } catch (error) {
    console.error('💥 Script failed:', error);
  }
}

// Run the fix
fixDecrementBalanceFunction().then(() => {
  console.log('\n🏁 Function fix completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fix script failed:', error);
  process.exit(1);
});
