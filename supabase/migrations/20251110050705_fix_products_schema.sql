/*
  # Fix Products Table Schema

  1. Changes
    - Add missing columns for proper product management
    - Rename columns to match frontend expectations
    - Add proper constraints and defaults
    - Update RLS policies

  2. New Columns
    - current_stock (replaces quantity)
    - unit_price (replaces price)
    - minimum_stock (replaces threshold)
    - category (text field)
    - vendor_name (text field)
    - expiration_date (date field)

  3. Security
    - Update RLS policies for authenticated users
*/

-- Add new columns if they don't exist
DO $$ 
BEGIN
  -- Add current_stock if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'current_stock'
  ) THEN
    ALTER TABLE products ADD COLUMN current_stock integer DEFAULT 0;
  END IF;

  -- Add unit_price if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'unit_price'
  ) THEN
    ALTER TABLE products ADD COLUMN unit_price numeric(10,2) DEFAULT 0;
  END IF;

  -- Add minimum_stock if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'minimum_stock'
  ) THEN
    ALTER TABLE products ADD COLUMN minimum_stock integer DEFAULT 10;
  END IF;

  -- Add category as text if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'category'
  ) THEN
    ALTER TABLE products ADD COLUMN category text;
  END IF;

  -- Add vendor_name if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'vendor_name'
  ) THEN
    ALTER TABLE products ADD COLUMN vendor_name text;
  END IF;

  -- Add expiration_date if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'expiration_date'
  ) THEN
    ALTER TABLE products ADD COLUMN expiration_date date;
  END IF;
END $$;

-- Migrate data from old columns to new columns
UPDATE products 
SET 
  current_stock = COALESCE(quantity, 0),
  unit_price = COALESCE(price, 0),
  minimum_stock = COALESCE(threshold, 10)
WHERE current_stock = 0 OR unit_price = 0;

-- Enable RLS if not already enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read products" ON products;
DROP POLICY IF EXISTS "Managers can insert products" ON products;
DROP POLICY IF EXISTS "Managers can update products" ON products;
DROP POLICY IF EXISTS "Managers can delete products" ON products;

-- Create new policies
CREATE POLICY "Users can read products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and supervisors can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('manager', 'supervisor')
      AND status = 'active'
    )
  );

CREATE POLICY "Managers and supervisors can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('manager', 'supervisor')
      AND status = 'active'
    )
  );

CREATE POLICY "Managers can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role = 'manager'
      AND status = 'active'
    )
  );
