-- Migration: Add investment duration fields
-- This migration adds fields to support user-selected investment durations

-- Add user_selected_duration_weeks to investments table
ALTER TABLE public.investments 
ADD COLUMN IF NOT EXISTS user_selected_duration_weeks INTEGER CHECK (user_selected_duration_weeks >= 1);

-- Add maturity_date to investments table (calculated from start_date + user_selected_duration_weeks)
ALTER TABLE public.investments 
ADD COLUMN IF NOT EXISTS maturity_date TIMESTAMP WITH TIME ZONE;

-- Add early_withdrawal_penalty_percent to investments table
ALTER TABLE public.investments 
ADD COLUMN IF NOT EXISTS early_withdrawal_penalty_percent DECIMAL(5, 2) DEFAULT 10.00 CHECK (early_withdrawal_penalty_percent >= 0);

-- Add is_matured to investments table for easy querying
ALTER TABLE public.investments 
ADD COLUMN IF NOT EXISTS is_matured BOOLEAN DEFAULT FALSE;

-- Add projected_maturity_value to investments table for caching calculated values
ALTER TABLE public.investments 
ADD COLUMN IF NOT EXISTS projected_maturity_value DECIMAL(20, 8);

-- Create index for performance on new fields
CREATE INDEX IF NOT EXISTS idx_investments_maturity_date ON public.investments(maturity_date);
CREATE INDEX IF NOT EXISTS idx_investments_is_matured ON public.investments(is_matured);
CREATE INDEX IF NOT EXISTS idx_investments_user_selected_duration ON public.investments(user_selected_duration_weeks);

-- Create function to calculate maturity date
CREATE OR REPLACE FUNCTION calculate_maturity_date(
  start_date TIMESTAMP WITH TIME ZONE,
  duration_weeks INTEGER
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  RETURN start_date + (duration_weeks * INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate projected maturity value
CREATE OR REPLACE FUNCTION calculate_projected_maturity_value(
  invested_amount DECIMAL,
  weekly_profit_percent DECIMAL,
  duration_weeks INTEGER
) RETURNS DECIMAL AS $$
DECLARE
  result DECIMAL := invested_amount;
  week INTEGER;
BEGIN
  FOR week IN 1..duration_weeks LOOP
    result := result * (1 + weekly_profit_percent / 100);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if investment is matured
CREATE OR REPLACE FUNCTION check_investment_maturity()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if maturity_date is set and has passed
  IF NEW.maturity_date IS NOT NULL AND NEW.maturity_date <= NOW() THEN
    NEW.is_matured := TRUE;
    NEW.status := 'completed';
  ELSE
    NEW.is_matured := FALSE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update maturity status
CREATE TRIGGER trigger_check_investment_maturity
  BEFORE UPDATE ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION check_investment_maturity();

-- Create function to get investment progress percentage
CREATE OR REPLACE FUNCTION get_investment_progress_percentage(
  investment_start_date TIMESTAMP WITH TIME ZONE,
  investment_maturity_date TIMESTAMP WITH TIME ZONE
) RETURNS DECIMAL AS $$
DECLARE
  total_duration_days INTEGER;
  elapsed_days INTEGER;
  progress_percentage DECIMAL;
BEGIN
  -- Calculate total duration in days
  total_duration_days := EXTRACT(EPOCH FROM (investment_maturity_date - investment_start_date)) / 86400;
  
  -- Calculate elapsed days
  elapsed_days := EXTRACT(EPOCH FROM (NOW() - investment_start_date)) / 86400;
  
  -- Calculate progress percentage (0-100)
  progress_percentage := LEAST(100, GREATEST(0, (elapsed_days::DECIMAL / total_duration_days::DECIMAL) * 100));
  
  RETURN progress_percentage;
END;
$$ LANGUAGE plpgsql;

-- Create function to get days until maturity
CREATE OR REPLACE FUNCTION get_days_until_maturity(
  investment_maturity_date TIMESTAMP WITH TIME ZONE
) RETURNS INTEGER AS $$
DECLARE
  days_until INTEGER;
BEGIN
  days_until := EXTRACT(EPOCH FROM (investment_maturity_date - NOW())) / 86400;
  RETURN GREATEST(0, days_until);
END;
$$ LANGUAGE plpgsql;

-- Update existing investments to set default values
UPDATE public.investments 
SET 
  user_selected_duration_weeks = 12, -- Default to 12 weeks for existing investments
  maturity_date = start_date + INTERVAL '12 weeks',
  early_withdrawal_penalty_percent = 10.00,
  is_matured = (start_date + INTERVAL '12 weeks' <= NOW())
WHERE user_selected_duration_weeks IS NULL;

-- Update projected maturity values for existing investments
UPDATE public.investments 
SET projected_maturity_value = calculate_projected_maturity_value(
  invested_amount,
  (SELECT weekly_profit_percent FROM public.investment_plans WHERE id = plan_id),
  COALESCE(user_selected_duration_weeks, 12)
)
WHERE projected_maturity_value IS NULL;
