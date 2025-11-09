-- Create stock_movements table for tracking inventory changes
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'purchase', 'adjustment', 'return', 'waste')),
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create low_stock_alerts table
CREATE TABLE IF NOT EXISTS public.low_stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  current_quantity INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create fraud_alerts table
CREATE TABLE IF NOT EXISTS public.fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('suspicious_movement', 'price_anomaly', 'negative_stock', 'unauthorized_access', 'unusual_pattern')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on new tables
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.low_stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stock_movements
CREATE POLICY "Everyone can view stock movements"
  ON public.stock_movements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers and supervisors can create stock movements"
  ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Only managers can delete stock movements"
  ON public.stock_movements FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role));

-- RLS Policies for low_stock_alerts
CREATE POLICY "Everyone can view alerts"
  ON public.low_stock_alerts FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can create alerts"
  ON public.low_stock_alerts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Managers and supervisors can update alerts"
  ON public.low_stock_alerts FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- RLS Policies for fraud_alerts
CREATE POLICY "Managers can view fraud alerts"
  ON public.fraud_alerts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "System can create fraud alerts"
  ON public.fraud_alerts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Managers can resolve fraud alerts"
  ON public.fraud_alerts FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role));

-- Add pending status to user_roles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typelem = 0) THEN
    ALTER TYPE app_role ADD VALUE 'pending';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create function to automatically create low stock alerts
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for low stock alerts
DROP TRIGGER IF EXISTS check_low_stock_trigger ON public.products;
CREATE TRIGGER check_low_stock_trigger
  AFTER INSERT OR UPDATE OF quantity_in_stock ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION check_low_stock();

-- Create function to detect fraud patterns
CREATE OR REPLACE FUNCTION detect_fraud_patterns()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for negative stock
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

  -- Check for unusually large adjustments
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
$$ LANGUAGE plpgsql;

-- Create trigger for fraud detection
DROP TRIGGER IF EXISTS detect_fraud_trigger ON public.stock_movements;
CREATE TRIGGER detect_fraud_trigger
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION detect_fraud_patterns();

-- Create function to calculate CMV
CREATE OR REPLACE FUNCTION calculate_cmv(start_date DATE, end_date DATE)
RETURNS TABLE (
  total_inicial NUMERIC,
  total_compras NUMERIC,
  total_final NUMERIC,
  cmv NUMERIC
) AS $$
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
$$ LANGUAGE plpgsql;

-- Add email domain validation function
CREATE OR REPLACE FUNCTION validate_email_domain()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email NOT LIKE '%@zola-pizza.com' THEN
    RAISE EXCEPTION 'Only @zola-pizza.com emails are allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for email validation
DROP TRIGGER IF EXISTS validate_email_domain_trigger ON auth.users;
CREATE TRIGGER validate_email_domain_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION validate_email_domain();

-- Update handle_new_user function to set pending status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  -- Assign default 'pending' role to new users (manager will approve)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'pending'::app_role);
  
  RETURN NEW;
END;
$function$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON public.stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_product ON public.low_stock_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_resolved ON public.low_stock_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_resolved ON public.fraud_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_severity ON public.fraud_alerts(severity);