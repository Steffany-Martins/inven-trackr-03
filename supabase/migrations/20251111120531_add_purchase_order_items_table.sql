/*
  # Add Purchase Order Items Table

  1. New Table
    - `purchase_order_items` - Line items for purchase orders
      - `id` (uuid, primary key)
      - `purchase_order_id` (uuid, references purchase_orders)
      - `product_id` (uuid, references products)
      - `quantity` (numeric)
      - `unit_price` (numeric)
      - `total_price` (numeric, computed)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Authenticated users can read
    - Managers and supervisors can insert/update/delete
*/

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view purchase order items" ON purchase_order_items;
CREATE POLICY "Authenticated users can view purchase order items"
  ON purchase_order_items
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Managers and supervisors can insert purchase order items" ON purchase_order_items;
CREATE POLICY "Managers and supervisors can insert purchase order items"
  ON purchase_order_items
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

DROP POLICY IF EXISTS "Managers and supervisors can update purchase order items" ON purchase_order_items;
CREATE POLICY "Managers and supervisors can update purchase order items"
  ON purchase_order_items
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

DROP POLICY IF EXISTS "Managers can delete purchase order items" ON purchase_order_items;
CREATE POLICY "Managers can delete purchase order items"
  ON purchase_order_items
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