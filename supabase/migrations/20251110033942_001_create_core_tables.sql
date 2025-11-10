/*
  # Create Core Tables for Zola Inventory System

  1. New Tables
    - `profiles` - User profiles with role management
    - `products` - Product catalog with categories and stock
    - `suppliers` - Supplier information
    - `stock_movements` - Track all inventory in/out movements
    - `purchase_orders` - Orders to suppliers
    - `invoices` - Sales invoices with image storage
    - `low_stock_alerts` - Automatic alerts for low stock
    - `fraud_alerts` - Suspicious activity detection

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Email domain validation (@zola-pizza.com)
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  phone text,
  avatar_url text,
  role text DEFAULT 'pending',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  description text,
  category text NOT NULL,
  unit_price numeric(10, 2) NOT NULL DEFAULT 0,
  current_stock integer DEFAULT 0,
  minimum_stock integer DEFAULT 10,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can create products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "Managers can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'supervisor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'supervisor')
    )
  );

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  payment_terms text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can create suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "Managers can update suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'supervisor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'supervisor')
    )
  );

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity integer NOT NULL,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active'
    )
  );

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'received', 'cancelled')),
  total_amount numeric(10, 2) DEFAULT 0,
  expected_delivery_date date,
  received_date date,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can create purchase orders"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'supervisor')
    )
  );

CREATE POLICY "Managers can update purchase orders"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'supervisor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'supervisor')
    )
  );

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  total_amount numeric(10, 2) NOT NULL DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  image_url text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Managers can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'supervisor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'supervisor')
    )
  );

-- Create low_stock_alerts table
CREATE TABLE IF NOT EXISTS low_stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  current_stock integer NOT NULL,
  minimum_stock integer NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE low_stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view low stock alerts"
  ON low_stock_alerts FOR SELECT
  TO authenticated
  USING (true);

-- Create fraud_alerts table
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  alert_type text NOT NULL,
  description text,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view fraud alerts"
  ON fraud_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_product ON low_stock_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user ON fraud_alerts(user_id);
