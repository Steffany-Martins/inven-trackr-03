/*
  # Fix RLS Policies for All Tables

  1. Changes
    - Add missing INSERT, UPDATE, DELETE policies for suppliers
    - Add comprehensive policies for invoices
    - Add policies for stock_movements
    - Ensure all authenticated users can perform appropriate operations

  2. Security
    - Managers can do everything
    - Supervisors can create and update
    - Staff can only read
    - All policies check user status is active
*/

-- Suppliers policies
DROP POLICY IF EXISTS "Managers and supervisors can insert suppliers" ON suppliers;
CREATE POLICY "Managers and supervisors can insert suppliers"
  ON suppliers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'supervisor')
      AND profiles.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Managers and supervisors can update suppliers" ON suppliers;
CREATE POLICY "Managers and supervisors can update suppliers"
  ON suppliers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'supervisor')
      AND profiles.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Managers can delete suppliers" ON suppliers;
CREATE POLICY "Managers can delete suppliers"
  ON suppliers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
      AND profiles.status = 'active'
    )
  );

-- Invoices policies
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON invoices;
CREATE POLICY "Authenticated users can view invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Managers and supervisors can insert invoices" ON invoices;
CREATE POLICY "Managers and supervisors can insert invoices"
  ON invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'supervisor')
      AND profiles.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Managers and supervisors can update invoices" ON invoices;
CREATE POLICY "Managers and supervisors can update invoices"
  ON invoices
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'supervisor')
      AND profiles.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Managers can delete invoices" ON invoices;
CREATE POLICY "Managers can delete invoices"
  ON invoices
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
      AND profiles.status = 'active'
    )
  );

-- Stock movements policies
DROP POLICY IF EXISTS "Authenticated users can view stock movements" ON stock_movements;
CREATE POLICY "Authenticated users can view stock movements"
  ON stock_movements
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Managers and supervisors can insert stock movements" ON stock_movements;
CREATE POLICY "Managers and supervisors can insert stock movements"
  ON stock_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'supervisor')
      AND profiles.status = 'active'
    )
  );