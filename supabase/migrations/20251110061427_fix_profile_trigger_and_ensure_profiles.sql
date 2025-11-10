/*
  # Fix Profile Creation and Ensure Profiles Exist

  1. Changes
    - Create or replace function to handle profile creation
    - Ensure profile is created for existing users
    - Add trigger to automatically create profile on signup

  2. Security
    - Maintains existing RLS policies
*/

-- Function to create profile if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'pending',
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure the existing user has a profile (this is idempotent)
INSERT INTO public.profiles (id, email, full_name, role, status)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email),
  'manager',
  'active'
FROM auth.users
WHERE email = 'developer@zola-pizza.com'
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'manager',
  status = 'active',
  updated_at = NOW();
