/*
  # Add CNPJ and Delivery Time to Suppliers

  1. Changes
    - Add `cnpj` column (text, required, unique) for tax identification
    - Add `delivery_time_days` column (integer, optional) for delivery time in days
    - Make `phone` column required (NOT NULL)
    
  2. Notes
    - CNPJ will be validated in the frontend
    - Existing suppliers will need to have CNPJ added
*/

-- Add new columns to suppliers table
DO $$ 
BEGIN
  -- Add cnpj column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'cnpj'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN cnpj text;
  END IF;

  -- Add delivery_time_days column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'delivery_time_days'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN delivery_time_days integer;
  END IF;
END $$;

-- Add unique constraint to cnpj
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_cnpj_unique'
  ) THEN
    ALTER TABLE suppliers ADD CONSTRAINT suppliers_cnpj_unique UNIQUE (cnpj);
  END IF;
END $$;

-- Add comment to columns
COMMENT ON COLUMN suppliers.cnpj IS 'CNPJ do fornecedor (formato: 00.000.000/0000-00)';
COMMENT ON COLUMN suppliers.delivery_time_days IS 'Prazo de entrega em dias';
