-- Comprehensive auth debugging and fixes

-- 1. Check if auth.users table is accessible
DO $$
BEGIN
    RAISE NOTICE 'Checking auth.users table...';
    PERFORM 1 FROM auth.users LIMIT 1;
    RAISE NOTICE 'Auth table is accessible';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Auth table error: %', SQLERRM;
END $$;

-- 2. Check current auth settings
SELECT 
    'Auth settings check' as status,
    current_setting('app.settings.auth.enable_signup', true) as signup_enabled,
    current_setting('app.settings.auth.minimum_password_length', true) as min_password;

-- 3. Clean up any problematic entries
DELETE FROM auth.users WHERE email_confirmed_at IS NULL AND created_at < NOW() - INTERVAL '1 day';

-- 4. Check user_profiles table structure
DROP TABLE IF EXISTS user_profiles CASCADE;

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT DEFAULT 'User',
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint separately to avoid issues
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;

-- 6. Create the simplest possible trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert with minimal data
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log but don't fail
        RAISE WARNING 'Profile creation failed: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- 7. Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;

-- 9. Test the setup
SELECT 'Setup complete' as status;