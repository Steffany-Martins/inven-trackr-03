/*
  # Fix Purchase Order Items RLS Policies

  1. Problem
    - Missing UPDATE and DELETE policies
    
  2. Solution
    - Add complete CRUD policies using get_my_role()
    
  3. Security
    - All authenticated users can read items
    - Managers and supervisors can insert/update
    - Only managers can delete
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read purchase order items" ON purchase_order_items;
DROP POLICY IF EXISTS "Managers and supervisors can insert purchase order items" ON purchase_order_items;

-- Policy: All authenticated users can read purchase order items
CREATE POLICY "Users can read purchase order items"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Managers and supervisors can insert purchase order items
CREATE POLICY "Managers and supervisors can insert purchase order items"
  ON purchase_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() IN ('manager', 'supervisor')
  );

-- Policy: Managers and supervisors can update purchase order items
CREATE POLICY "Managers and supervisors can update purchase order items"
  ON purchase_order_items FOR UPDATE
  TO authenticated
  USING (
    get_my_role() IN ('manager', 'supervisor')
  )
  WITH CHECK (
    get_my_role() IN ('manager', 'supervisor')
  );

-- Policy: Only managers can delete purchase order items
CREATE POLICY "Managers can delete purchase order items"
  ON purchase_order_items FOR DELETE
  TO authenticated
  USING (get_my_role() = 'manager');
