-- Create admin_actions table for tracking administrative activities

-- This function will be called from the ActivityLog component to create the table if it doesn't exist
CREATE OR REPLACE FUNCTION public.create_admin_actions_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the table already exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_actions') THEN
    -- Create the admin_actions table
    CREATE TABLE public.admin_actions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      admin_id UUID NOT NULL REFERENCES auth.users(id),
      action_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      ip_address TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      
      -- Add constraints
      CONSTRAINT admin_actions_action_type_check CHECK (action_type IN ('create', 'update', 'delete', 'approve', 'reject')),
      CONSTRAINT admin_actions_entity_type_check CHECK (entity_type IN ('user', 'deposit', 'withdrawal', 'profit', 'referral'))
    );

    -- Add indexes for better query performance
    CREATE INDEX admin_actions_admin_id_idx ON public.admin_actions(admin_id);
    CREATE INDEX admin_actions_action_type_idx ON public.admin_actions(action_type);
    CREATE INDEX admin_actions_entity_type_idx ON public.admin_actions(entity_type);
    CREATE INDEX admin_actions_created_at_idx ON public.admin_actions(created_at);

    -- Set up RLS (Row Level Security)
    ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

    -- Create policy to allow admins to view all actions
    CREATE POLICY "Admins can view all actions"
      ON public.admin_actions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_roles.user_id = auth.uid()
          AND user_roles.role = 'admin'
        )
      );

    -- Create policy to allow admins to insert actions
    CREATE POLICY "Admins can insert actions"
      ON public.admin_actions
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_roles.user_id = auth.uid()
          AND user_roles.role = 'admin'
        )
      );
  END IF;
END;
$$;

-- Helper function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_admin_id UUID,
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_details JSONB,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action_id UUID;
BEGIN
  -- Ensure the admin_actions table exists
  PERFORM create_admin_actions_table();
  
  -- Insert the action and return the ID
  INSERT INTO public.admin_actions (
    admin_id,
    action_type,
    entity_type,
    entity_id,
    details,
    ip_address
  ) VALUES (
    p_admin_id,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_details,
    p_ip_address
  ) RETURNING id INTO v_action_id;
  
  RETURN v_action_id;
END;
$$;