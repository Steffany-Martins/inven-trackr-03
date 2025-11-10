/*
  # Auto Manager for Developer/Code Emails

  1. Changes
    - Update trigger to automatically set users as 'manager' if email contains 'developer' or 'code'
    - Other @zola-pizza.com users are created as 'staff' with 'pending' status
    - Managers get 'active' status automatically

  2. Logic
    - developer@zola-pizza.com → manager + active
    - code@zola-pizza.com → manager + active
    - anyname@zola-pizza.com → staff + pending
*/

-- Update the function with smart role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role text;
  user_status text;
BEGIN
  -- Check if email contains 'developer' or 'code'
  IF NEW.email ~* '(developer|code)@' THEN
    user_role := 'manager';
    user_status := 'active';
  ELSE
    user_role := 'staff';
    user_status := 'pending';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    user_role,
    user_status
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
