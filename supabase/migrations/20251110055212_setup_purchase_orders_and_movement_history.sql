/*
  # Setup Purchase Orders and Automatic Movement History

  1. New Tables
    - `purchase_orders` - Pedidos de compra dos fornecedores
      - `id` (uuid, primary key)
      - `order_number` (text, unique)
      - `supplier_id` (uuid, foreign key)
      - `supplier_name` (text)
      - `order_date` (date)
      - `expected_delivery` (date)
      - `total_value` (numeric)
      - `status` (text: pending, confirmed, delivered, cancelled)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `purchase_order_items` - Itens dos pedidos
      - `id` (uuid, primary key)
      - `purchase_order_id` (uuid, foreign key)
      - `product_id` (uuid, foreign key)
      - `product_name` (text)
      - `quantity` (numeric)
      - `unit` (text)
      - `unit_price` (numeric)
      - `total_price` (numeric)

  2. Changes
    - Create triggers to automatically log stock movements
    - Update invoices to represent supplier invoices (faturas)
    - Create purchase orders for supplier orders (pedidos)

  3. Security
    - Enable RLS on all new tables
    - Appropriate policies for authenticated users
*/

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id),
  supplier_name text NOT NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery date,
  total_value numeric(10,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit text NOT NULL DEFAULT 'unidades',
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_orders
CREATE POLICY "Users can read purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and supervisors can insert purchase orders"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('manager', 'supervisor')
      AND status = 'active'
    )
  );

CREATE POLICY "Managers and supervisors can update purchase orders"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('manager', 'supervisor')
      AND status = 'active'
    )
  );

CREATE POLICY "Managers can delete purchase orders"
  ON purchase_orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role = 'manager'
      AND status = 'active'
    )
  );

-- RLS Policies for purchase_order_items
CREATE POLICY "Users can read purchase order items"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and supervisors can insert purchase order items"
  ON purchase_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('manager', 'supervisor')
      AND status = 'active'
    )
  );

-- Function to automatically log stock movements when products change
CREATE OR REPLACE FUNCTION log_product_stock_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if stock actually changed
  IF (TG_OP = 'UPDATE' AND OLD.current_stock != NEW.current_stock) THEN
    INSERT INTO stock_movements (
      product_id,
      product_name,
      user_id,
      movement_type,
      quantity_before,
      quantity_after,
      quantity_change,
      unit_price,
      total_value,
      reason,
      action_type,
      created_at
    ) VALUES (
      NEW.id,
      NEW.name,
      auth.uid(),
      CASE 
        WHEN NEW.current_stock > OLD.current_stock THEN 'entrada'
        ELSE 'saida'
      END,
      OLD.current_stock,
      NEW.current_stock,
      NEW.current_stock - OLD.current_stock,
      NEW.unit_price,
      (NEW.current_stock - OLD.current_stock) * NEW.unit_price,
      'Atualização de produto',
      'update',
      now()
    );
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO stock_movements (
      product_id,
      product_name,
      user_id,
      movement_type,
      quantity_before,
      quantity_after,
      quantity_change,
      unit_price,
      total_value,
      reason,
      action_type,
      created_at
    ) VALUES (
      NEW.id,
      NEW.name,
      auth.uid(),
      'entrada',
      0,
      NEW.current_stock,
      NEW.current_stock,
      NEW.unit_price,
      NEW.current_stock * NEW.unit_price,
      'Produto criado',
      'insert',
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic stock movement logging
DROP TRIGGER IF EXISTS log_stock_movement ON products;
CREATE TRIGGER log_stock_movement
  AFTER INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION log_product_stock_change();

-- Function to update stock when purchase order is delivered
CREATE OR REPLACE FUNCTION update_stock_from_purchase_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update stock when status changes to 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Update stock for each item in the purchase order
    UPDATE products p
    SET 
      current_stock = p.current_stock + poi.quantity,
      quantity = p.quantity + poi.quantity
    FROM purchase_order_items poi
    WHERE poi.purchase_order_id = NEW.id
      AND poi.product_id = p.id;
    
    -- Log the stock movement
    INSERT INTO stock_movements (
      product_id,
      product_name,
      user_id,
      movement_type,
      quantity_change,
      unit_price,
      reason,
      action_type,
      metadata
    )
    SELECT 
      poi.product_id,
      poi.product_name,
      auth.uid(),
      'entrada',
      poi.quantity,
      poi.unit_price,
      'Pedido de compra #' || NEW.order_number || ' entregue',
      'purchase_order_delivered',
      jsonb_build_object(
        'purchase_order_id', NEW.id,
        'order_number', NEW.order_number,
        'supplier_name', NEW.supplier_name
      )
    FROM purchase_order_items poi
    WHERE poi.purchase_order_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for purchase order delivery
DROP TRIGGER IF EXISTS update_stock_on_delivery ON purchase_orders;
CREATE TRIGGER update_stock_on_delivery
  AFTER UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_from_purchase_order();

-- Add sample purchase orders
INSERT INTO purchase_orders (order_number, supplier_name, order_date, expected_delivery, total_value, status, notes) VALUES
('PO-2025-001', 'Fornecedor Ingredientes São Paulo', '2025-11-01', '2025-11-05', 850.50, 'delivered', 'Pedido de ingredientes básicos'),
('PO-2025-002', 'Distribuidora Alimentos Brasil', '2025-11-03', '2025-11-07', 1240.00, 'delivered', 'Pedido de frios e embutidos'),
('PO-2025-003', 'Mercado Atacadista Central', '2025-11-05', '2025-11-10', 385.20, 'confirmed', 'Pedido de vegetais frescos'),
('PO-2025-004', 'Distribuidora Alimentos Brasil', '2025-11-08', '2025-11-12', 980.00, 'pending', 'Pedido de bebidas');
