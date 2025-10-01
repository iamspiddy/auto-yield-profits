-- Create investment plans table
CREATE TABLE IF NOT EXISTS public.investment_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT NOT NULL,
  min_amount DECIMAL(20, 8) NOT NULL CHECK (min_amount > 0),
  weekly_profit_percent DECIMAL(5, 2) NOT NULL CHECK (weekly_profit_percent > 0),
  duration_weeks INTEGER, -- NULL means unlimited duration
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create investments table
CREATE TABLE IF NOT EXISTS public.investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.investment_plans(id) ON DELETE CASCADE NOT NULL,
  invested_amount DECIMAL(20, 8) NOT NULL CHECK (invested_amount > 0),
  current_balance DECIMAL(20, 8) NOT NULL CHECK (current_balance >= 0),
  total_profit_earned DECIMAL(20, 8) DEFAULT 0 CHECK (total_profit_earned >= 0),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_compound_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  next_compound_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE, -- NULL for unlimited plans
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create investment_compounds table to track weekly compounding history
CREATE TABLE IF NOT EXISTS public.investment_compounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  investment_id UUID REFERENCES public.investments(id) ON DELETE CASCADE NOT NULL,
  compound_date TIMESTAMP WITH TIME ZONE NOT NULL,
  balance_before DECIMAL(20, 8) NOT NULL,
  profit_amount DECIMAL(20, 8) NOT NULL,
  balance_after DECIMAL(20, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.investment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_compounds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for investment_plans (public read access)
CREATE POLICY "Anyone can view active investment plans" ON public.investment_plans
  FOR SELECT USING (is_active = true);

-- RLS Policies for investments
CREATE POLICY "Users can view their own investments" ON public.investments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own investments" ON public.investments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investments" ON public.investments
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for investment_compounds
CREATE POLICY "Users can view compounds for their investments" ON public.investment_compounds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.investments 
      WHERE id = investment_id AND user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_investments_user_id ON public.investments(user_id);
CREATE INDEX idx_investments_plan_id ON public.investments(plan_id);
CREATE INDEX idx_investments_status ON public.investments(status);
CREATE INDEX idx_investments_next_compound_date ON public.investments(next_compound_date);
CREATE INDEX idx_investment_compounds_investment_id ON public.investment_compounds(investment_id);
CREATE INDEX idx_investment_compounds_compound_date ON public.investment_compounds(compound_date);

-- Create function to calculate next compound date
CREATE OR REPLACE FUNCTION calculate_next_compound_date(start_date TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT start_date + INTERVAL '7 days' * CEIL(EXTRACT(EPOCH FROM (NOW() - start_date)) / (7 * 24 * 60 * 60))
$$;

-- Create function to apply weekly compounding
CREATE OR REPLACE FUNCTION apply_weekly_compounding()
RETURNS TABLE (
  investment_id UUID,
  profit_amount DECIMAL(20, 8),
  new_balance DECIMAL(20, 8)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  investment_record RECORD;
  profit DECIMAL(20, 8);
  new_balance DECIMAL(20, 8);
BEGIN
  -- Get all active investments that are due for compounding
  FOR investment_record IN
    SELECT 
      i.id,
      i.current_balance,
      i.total_profit_earned,
      p.weekly_profit_percent
    FROM public.investments i
    JOIN public.investment_plans p ON i.plan_id = p.id
    WHERE i.status = 'active' 
      AND i.next_compound_date <= NOW()
  LOOP
    -- Calculate profit
    profit := investment_record.current_balance * (investment_record.weekly_profit_percent / 100);
    new_balance := investment_record.current_balance + profit;
    
    -- Update investment
    UPDATE public.investments 
    SET 
      current_balance = new_balance,
      total_profit_earned = total_profit_earned + profit,
      last_compound_date = NOW(),
      next_compound_date = NOW() + INTERVAL '7 days',
      updated_at = NOW()
    WHERE id = investment_record.id;
    
    -- Record the compound transaction
    INSERT INTO public.investment_compounds (
      investment_id,
      compound_date,
      balance_before,
      profit_amount,
      balance_after
    ) VALUES (
      investment_record.id,
      NOW(),
      investment_record.current_balance,
      profit,
      new_balance
    );
    
    -- Return the result
    investment_id := investment_record.id;
    profit_amount := profit;
    new_balance := new_balance;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Insert default investment plans
INSERT INTO public.investment_plans (plan_name, min_amount, weekly_profit_percent, duration_weeks) VALUES
  ('Bronze', 200, 10.00, NULL),
  ('Silver', 400, 20.00, NULL),
  ('Gold', 800, 40.00, NULL),
  ('Diamond', 1200, 50.00, NULL);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_investment_plans_updated_at 
  BEFORE UPDATE ON public.investment_plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investments_updated_at 
  BEFORE UPDATE ON public.investments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
