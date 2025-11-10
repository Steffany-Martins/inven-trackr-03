/*
  # Update Invoices Bucket Configuration

  1. Changes
    - Set bucket to private (public = false) for security
    - Add file size limit (50MB)
    - Restrict allowed MIME types
    
  2. Security
    - Files are not publicly accessible
    - Only authenticated users with proper policies can access
*/

-- Update bucket configuration
UPDATE storage.buckets
SET 
  public = false,
  file_size_limit = 52428800, -- 50MB
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'text/csv'
  ]
WHERE id = 'invoices';
