-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('manager', 'supervisor', 'staff');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  -- Assign default 'staff' role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff');
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));

-- Update RLS policies for products table
DROP POLICY IF EXISTS "Allow all access to products" ON public.products;

CREATE POLICY "Authenticated users can view products"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and supervisors can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Managers and supervisors can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Only managers can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));

-- Update RLS policies for suppliers table
DROP POLICY IF EXISTS "Allow all access to suppliers" ON public.suppliers;

CREATE POLICY "Authenticated users can view suppliers"
  ON public.suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and supervisors can insert suppliers"
  ON public.suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Managers and supervisors can update suppliers"
  ON public.suppliers FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Only managers can delete suppliers"
  ON public.suppliers FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));

-- Update RLS policies for purchase_orders table
DROP POLICY IF EXISTS "Allow all access to purchase_orders" ON public.purchase_orders;

CREATE POLICY "Authenticated users can view purchase orders"
  ON public.purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and supervisors can insert purchase orders"
  ON public.purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Managers and supervisors can update purchase orders"
  ON public.purchase_orders FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Only managers can delete purchase orders"
  ON public.purchase_orders FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));

-- Update RLS policies for invoices table
DROP POLICY IF EXISTS "Allow all access to invoices" ON public.invoices;

CREATE POLICY "Authenticated users can view invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and supervisors can insert invoices"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Managers and supervisors can update invoices"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Only managers can delete invoices"
  ON public.invoices FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));

-- Update RLS policies for invoice_items table
DROP POLICY IF EXISTS "Allow all access to invoice_items" ON public.invoice_items;

CREATE POLICY "Authenticated users can view invoice items"
  ON public.invoice_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and supervisors can insert invoice items"
  ON public.invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Managers and supervisors can update invoice items"
  ON public.invoice_items FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Only managers can delete invoice items"
  ON public.invoice_items FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));