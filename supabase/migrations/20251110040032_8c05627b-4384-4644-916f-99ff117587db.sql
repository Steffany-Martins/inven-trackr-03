-- Add trigger to validate email domain on user signup
CREATE TRIGGER validate_zola_email
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_email_domain();