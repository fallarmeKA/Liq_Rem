-- Temporarily disable the trigger to test if basic auth works
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- We'll re-enable it once we confirm basic signup works