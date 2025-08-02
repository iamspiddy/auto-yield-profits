-- Add 'wallet' to withdrawal_type_enum
-- First, we need to create a new enum with the additional value
CREATE TYPE withdrawal_type_enum_new AS ENUM ('earnings', 'deposit', 'bonus', 'wallet');

-- Temporarily remove the default constraint
ALTER TABLE public.withdrawals ALTER COLUMN withdrawal_type DROP DEFAULT;

-- Update existing columns to use the new enum
ALTER TABLE public.withdrawals 
ALTER COLUMN withdrawal_type TYPE withdrawal_type_enum_new 
USING withdrawal_type::text::withdrawal_type_enum_new;

-- Drop the old enum
DROP TYPE withdrawal_type_enum;

-- Rename the new enum to the original name
ALTER TYPE withdrawal_type_enum_new RENAME TO withdrawal_type_enum;

-- Restore the default constraint
ALTER TABLE public.withdrawals ALTER COLUMN withdrawal_type SET DEFAULT 'earnings'; 