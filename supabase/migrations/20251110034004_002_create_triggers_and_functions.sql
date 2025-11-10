/*
  # Create Triggers and Functions for Automation

  1. Functions
    - `update_product_stock` - Updates product stock based on movements
    - `check_low_stock` - Automatically creates low stock alerts
    - `detect_suspicious_activity` - Detects potential fraud

  2. Triggers
    - Automatic stock updates on stock_movements insert
    - Automatic low stock alert creation
    - Automatic fraud alert on suspicious patterns
*/

-- Function to update product stock
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_type = 'in' THEN
    UPDATE products
    SET current_stock = current_stock + NEW.quantity
    WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'out' THEN
    UPDATE products
    SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'adjustment' THEN
    UPDATE products
    SET current_stock = NEW.quantity
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for stock updates
DROP TRIGGER IF EXISTS trigger_update_stock ON stock_movements;
CREATE TRIGGER trigger_update_stock
AFTER INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION update_product_stock();

-- Function to check and create low stock alerts
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_stock <= NEW.minimum_stock THEN
    INSERT INTO low_stock_alerts (product_id, current_stock, minimum_stock, status)
    VALUES (NEW.id, NEW.current_stock, NEW.minimum_stock, 'active')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for low stock alerts
DROP TRIGGER IF EXISTS trigger_check_low_stock ON products;
CREATE TRIGGER trigger_check_low_stock
AFTER UPDATE ON products
FOR EACH ROW
WHEN (NEW.current_stock <= NEW.minimum_stock)
EXECUTE FUNCTION check_low_stock();

-- Function to detect suspicious activity
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity > 100 AND NEW.movement_type = 'out' THEN
    INSERT INTO fraud_alerts (user_id, alert_type, description, severity)
    VALUES (
      NEW.created_by,
      'high_quantity_movement',
      'Large quantity movement detected: ' || NEW.quantity || ' units',
      'medium'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for fraud detection
DROP TRIGGER IF EXISTS trigger_fraud_detection ON stock_movements;
CREATE TRIGGER trigger_fraud_detection
AFTER INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION detect_suspicious_activity();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
DROP TRIGGER IF EXISTS trigger_products_updated_at ON products;
CREATE TRIGGER trigger_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_suppliers_updated_at ON suppliers;
CREATE TRIGGER trigger_suppliers_updated_at
BEFORE UPDATE ON suppliers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER trigger_purchase_orders_updated_at
BEFORE UPDATE ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_invoices_updated_at ON invoices;
CREATE TRIGGER trigger_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
