-- Add withdrawal_type column to withdrawals table
-- Create enum for withdrawal types if it doesn't exist
DO $$ BEGIN
    CREATE TYPE withdrawal_type_enum AS ENUM ('earnings', 'deposit', 'bonus');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add the column with the correct type (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'withdrawals' 
        AND column_name = 'withdrawal_type'
    ) THEN
        ALTER TABLE public.withdrawals 
        ADD COLUMN withdrawal_type withdrawal_type_enum DEFAULT 'earnings';
    END IF;
END $$; 