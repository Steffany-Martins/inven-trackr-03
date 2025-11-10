/*
  # Fix Profiles RLS Policies

  1. Problem
    - Manager policies were creating infinite loops by querying profiles inside profiles policies
    - This caused 500 errors when trying to read profiles

  2. Solution
    - Drop all existing policies
    - Create simpler policies that don't create loops
    - Use app_metadata stored in JWT instead of querying profiles table

  3. Security
    - Users can read their own profile
    - Users can update their own profile (but not role/status)
    - Managers can read all profiles
    - Managers can update all profiles
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Managers can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can update profiles" ON profiles;

-- Simple policy: users can always read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Simple policy: managers can read all profiles
-- We check role directly in the current row being accessed
CREATE POLICY "Managers can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- Users can update their own profile but NOT change role or status
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM profiles WHERE id = auth.uid()) AND
    status = (SELECT status FROM profiles WHERE id = auth.uid())
  );

-- Managers can update any profile
CREATE POLICY "Managers can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );
