/*
  # User Management System

  1. New Tables
    - `user_permissions` - Custom permissions for users
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `permission_name` (text) - e.g., 'can_add_products', 'can_edit_invoices'
      - `granted_by` (uuid, references profiles)
      - `granted_at` (timestamptz)

  2. Changes
    - Update handle_new_user to create users as 'staff' with 'pending' status
    - Add permissions table for granular access control
    
  3. Security
    - Enable RLS on user_permissions
    - Only managers can grant/revoke permissions
    - Only managers can change user roles
*/

-- Update function to create new users as staff with pending status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'staff',
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user_permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  permission_name text NOT NULL,
  granted_by uuid REFERENCES profiles(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, permission_name)
);

-- Enable RLS
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Managers can view all permissions
CREATE POLICY "Managers can view all permissions"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

-- Managers can grant permissions
CREATE POLICY "Managers can grant permissions"
  ON user_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

-- Managers can revoke permissions
CREATE POLICY "Managers can revoke permissions"
  ON user_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Update profiles RLS to allow managers to update roles
DROP POLICY IF EXISTS "Managers can update profiles" ON profiles;
CREATE POLICY "Managers can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'manager'
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_name ON user_permissions(permission_name);
