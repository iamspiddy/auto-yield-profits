-- Fix enum compatibility issues
-- Ensure withdrawal_status and transaction_status have compatible values

-- Update withdrawal_status enum if needed
DO $$ 
BEGIN
    -- Add any missing values to withdrawal_status enum
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'withdrawal_status')) THEN
        ALTER TYPE withdrawal_status ADD VALUE 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'processing' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'withdrawal_status')) THEN
        ALTER TYPE withdrawal_status ADD VALUE 'processing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'completed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'withdrawal_status')) THEN
        ALTER TYPE withdrawal_status ADD VALUE 'completed';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'withdrawal_status')) THEN
        ALTER TYPE withdrawal_status ADD VALUE 'rejected';
    END IF;
END $$;

-- Update transaction_status enum if needed
DO $$ 
BEGIN
    -- Add any missing values to transaction_status enum
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_status')) THEN
        ALTER TYPE transaction_status ADD VALUE 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'approved' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_status')) THEN
        ALTER TYPE transaction_status ADD VALUE 'approved';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_status')) THEN
        ALTER TYPE transaction_status ADD VALUE 'rejected';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'completed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_status')) THEN
        ALTER TYPE transaction_status ADD VALUE 'completed';
    END IF;
END $$; 