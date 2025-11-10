/*
  # Fix Profiles RLS with Security Definer Function

  1. Problem
    - Recursive policies create infinite loops
    
  2. Solution
    - Create a SECURITY DEFINER function that bypasses RLS
    - Use this function in policies to check user role
    
  3. Security
    - Function is safe because it only returns role for auth.uid()
    - Cannot be used to check other users' roles
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Managers can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can update all profiles" ON profiles;

-- Create a function to get current user's role without triggering RLS
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Policy: users can always read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: managers can read all profiles
CREATE POLICY "Managers can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (get_my_role() = 'manager');

-- Policy: users can update their own profile but NOT change role or status
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = get_my_role() AND
    status = (SELECT status FROM profiles WHERE id = auth.uid())
  );

-- Policy: managers can update any profile
CREATE POLICY "Managers can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'manager')
  WITH CHECK (get_my_role() = 'manager');
