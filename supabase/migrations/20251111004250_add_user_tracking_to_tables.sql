/*
  # Add User Tracking to Tables

  1. Changes
    - Add `created_by` and `updated_by` columns to track user actions
    - Add columns to: products, suppliers, invoices, purchase_orders
    - Create triggers to automatically set these fields
    
  2. Security
    - Columns reference auth.users for proper user tracking
*/

-- Add user tracking columns to products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE products ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE products ADD COLUMN updated_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add user tracking columns to suppliers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN updated_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add user tracking columns to invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE invoices ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE invoices ADD COLUMN updated_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add user tracking columns to purchase_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN updated_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Function to set created_by on insert
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set updated_by on update
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for products
DROP TRIGGER IF EXISTS products_set_created_by ON products;
CREATE TRIGGER products_set_created_by
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS products_set_updated_by ON products;
CREATE TRIGGER products_set_updated_by
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();

-- Create triggers for suppliers
DROP TRIGGER IF EXISTS suppliers_set_created_by ON suppliers;
CREATE TRIGGER suppliers_set_created_by
  BEFORE INSERT ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS suppliers_set_updated_by ON suppliers;
CREATE TRIGGER suppliers_set_updated_by
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();

-- Create triggers for invoices
DROP TRIGGER IF EXISTS invoices_set_created_by ON invoices;
CREATE TRIGGER invoices_set_created_by
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS invoices_set_updated_by ON invoices;
CREATE TRIGGER invoices_set_updated_by
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();

-- Create triggers for purchase_orders
DROP TRIGGER IF EXISTS purchase_orders_set_created_by ON purchase_orders;
CREATE TRIGGER purchase_orders_set_created_by
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS purchase_orders_set_updated_by ON purchase_orders;
CREATE TRIGGER purchase_orders_set_updated_by
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();