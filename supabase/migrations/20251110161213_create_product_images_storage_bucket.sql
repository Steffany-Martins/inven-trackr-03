/*
  # Create Product Images Storage Bucket

  1. New Storage Bucket
    - `product-images` bucket for storing product photos
    
  2. Storage Policies
    - Authenticated users can upload images
    - Everyone can read images (for display)
    - Only managers can delete images
    
  3. Security
    - Images are organized by product ID
    - File size limit: 5MB per image
    - Only image formats allowed
*/

-- Create the product-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true, -- Public so images can be displayed without signed URLs
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Policy: Authenticated users can upload product images
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' AND
  auth.uid() IS NOT NULL
);

-- Policy: Everyone can read product images (public bucket)
CREATE POLICY "Anyone can read product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Policy: Authenticated users can update their own uploads
CREATE POLICY "Users can update their own product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  auth.uid() = owner
)
WITH CHECK (
  bucket_id = 'product-images' AND
  auth.uid() = owner
);

-- Policy: Only managers can delete product images
CREATE POLICY "Managers can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  get_my_role() = 'manager'
);
