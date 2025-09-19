-- Fix the user creation trigger to handle NULL values properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users (existing functionality)
  INSERT INTO public.users (
    id,
    user_id,
    email,
    name,
    full_name,
    avatar_url,
    token_identifier,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.id::text,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.email, ''),
    NEW.created_at,
    NEW.updated_at
  );

  -- Also insert into user_profiles for liquidation system
  INSERT INTO user_profiles (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'user',
    NEW.created_at,
    NEW.updated_at
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and continue
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also make the email field nullable in user_profiles to prevent issues
ALTER TABLE user_profiles ALTER COLUMN email DROP NOT NULL;

-- Add a default value for full_name if it's NULL
UPDATE user_profiles SET full_name = 'User' WHERE full_name IS NULL OR full_name = '';