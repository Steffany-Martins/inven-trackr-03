/*
  # Fix Purchase Orders RLS Policies

  1. Problem
    - Policies are using recursive queries that may cause issues
    
  2. Solution
    - Use the get_my_role() function to avoid recursion
    - Simplify policies for better performance
    
  3. Security
    - All authenticated users can read purchase orders
    - Managers and supervisors can insert/update
    - Only managers can delete
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Managers and supervisors can insert purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Managers and supervisors can update purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Managers can delete purchase orders" ON purchase_orders;

-- Policy: All authenticated users can read purchase orders
CREATE POLICY "Users can read purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Managers and supervisors can insert purchase orders
CREATE POLICY "Managers and supervisors can insert purchase orders"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() IN ('manager', 'supervisor')
  );

-- Policy: Managers and supervisors can update purchase orders
CREATE POLICY "Managers and supervisors can update purchase orders"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (
    get_my_role() IN ('manager', 'supervisor')
  )
  WITH CHECK (
    get_my_role() IN ('manager', 'supervisor')
  );

-- Policy: Only managers can delete purchase orders
CREATE POLICY "Managers can delete purchase orders"
  ON purchase_orders FOR DELETE
  TO authenticated
  USING (get_my_role() = 'manager');
