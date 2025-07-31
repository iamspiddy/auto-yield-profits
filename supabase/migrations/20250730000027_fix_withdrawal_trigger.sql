-- Fix the handle_withdrawal_transaction trigger function to properly cast enum types
CREATE OR REPLACE FUNCTION public.handle_withdrawal_transaction()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    v_status_text TEXT;
BEGIN
    -- Convert withdrawal_status to text first, then to transaction_status
    v_status_text := NEW.status::TEXT;
    
    -- Insert into transactions table when a withdrawal is created
    INSERT INTO public.transactions (
        user_id,
        type,
        amount,
        currency,
        status,
        reference_id,
        description
    ) VALUES (
        NEW.user_id,
        'withdrawal'::transaction_type,
        NEW.amount,
        NEW.currency,
        v_status_text::transaction_status,  -- Cast text to transaction_status
        NEW.id,
        COALESCE(NEW.notes, 'Withdrawal')
    );
    
    RETURN NEW;
END;
$function$; 