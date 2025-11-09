-- Fix search_path for security functions
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.quantity_in_stock <= NEW.threshold THEN
    INSERT INTO public.low_stock_alerts (product_id, current_quantity, threshold, severity)
    VALUES (
      NEW.id,
      NEW.quantity_in_stock,
      NEW.threshold,
      CASE
        WHEN NEW.quantity_in_stock = 0 THEN 'critical'
        WHEN NEW.quantity_in_stock <= NEW.threshold * 0.5 THEN 'high'
        ELSE 'medium'
      END
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION detect_fraud_patterns()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.quantity < 0 AND NEW.movement_type = 'adjustment' THEN
    INSERT INTO public.fraud_alerts (alert_type, severity, description, reference_id, reference_type)
    VALUES (
      'negative_stock',
      'high',
      'Ajuste manual resultou em quantidade negativa',
      NEW.id,
      'stock_movement'
    );
  END IF;

  IF NEW.movement_type = 'adjustment' AND ABS(NEW.quantity) > 100 THEN
    INSERT INTO public.fraud_alerts (alert_type, severity, description, reference_id, reference_type)
    VALUES (
      'suspicious_movement',
      'medium',
      'Ajuste manual de quantidade anormalmente alta: ' || ABS(NEW.quantity)::TEXT,
      NEW.id,
      'stock_movement'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_cmv(start_date DATE, end_date DATE)
RETURNS TABLE (
  total_inicial NUMERIC,
  total_compras NUMERIC,
  total_final NUMERIC,
  cmv NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH stock_inicial AS (
    SELECT COALESCE(SUM(p.unit_price * p.quantity_in_stock), 0) as valor
    FROM products p
  ),
  compras AS (
    SELECT COALESCE(SUM(po.price * po.quantity), 0) as valor
    FROM purchase_orders po
    WHERE po.delivery_date BETWEEN start_date AND end_date
    AND po.delivery_status = 'delivered'
  ),
  stock_final AS (
    SELECT COALESCE(SUM(p.unit_price * p.quantity_in_stock), 0) as valor
    FROM products p
  )
  SELECT 
    si.valor as total_inicial,
    c.valor as total_compras,
    sf.valor as total_final,
    (si.valor + c.valor - sf.valor) as cmv
  FROM stock_inicial si, compras c, stock_final sf;
END;
$$;

CREATE OR REPLACE FUNCTION validate_email_domain()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email NOT LIKE '%@zola-pizza.com' THEN
    RAISE EXCEPTION 'Only @zola-pizza.com emails are allowed';
  END IF;
  RETURN NEW;
END;
$$;