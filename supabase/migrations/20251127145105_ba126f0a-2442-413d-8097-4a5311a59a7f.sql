-- Fix storage bucket policies for invoice downloads
-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Public invoice access" ON storage.objects;

-- Allow public read access to invoices bucket
CREATE POLICY "Public can download invoices"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoices');

-- Allow authenticated users to upload invoices (for edge functions)
CREATE POLICY "Authenticated users can upload invoices"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invoices' 
  AND auth.role() = 'authenticated'
);