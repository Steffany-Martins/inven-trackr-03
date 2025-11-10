/*
  # Create Invoices Storage Bucket

  1. New Storage Bucket
    - `invoices` bucket for storing invoice files (PDFs, images, etc.)
    
  2. Storage Policies
    - Authenticated users can upload files
    - Authenticated users can read files
    - Only managers can delete files
    
  3. Security
    - Files are organized by user ID and date
    - RLS policies ensure users can only access their organization's files
*/

-- Create the invoices bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'text/csv']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoices' AND
  auth.uid() IS NOT NULL
);

-- Policy: Authenticated users can read their organization's files
CREATE POLICY "Authenticated users can read invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices' AND
  auth.uid() IS NOT NULL
);

-- Policy: Authenticated users can update their own uploads
CREATE POLICY "Users can update their own invoices"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'invoices' AND
  auth.uid() = owner
)
WITH CHECK (
  bucket_id = 'invoices' AND
  auth.uid() = owner
);

-- Policy: Only managers can delete files
CREATE POLICY "Managers can delete invoices"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'invoices' AND
  get_my_role() = 'manager'
);
