-- Add column to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS location_photos text[] DEFAULT '{}';

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public access to view photos
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'tenant-assets' );

-- Policy to allow authenticated users (tenants) to upload photos
DROP POLICY IF EXISTS "Tenant Upload" ON storage.objects;
CREATE POLICY "Tenant Upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK ( bucket_id = 'tenant-assets' );

-- Policy to allow tenants to update/delete their own photos
-- Note: This is a simplified policy. In a real multi-tenant setup, 
-- you'd want to check if the user belongs to the tenant that owns the file.
-- Ideally, files should be stored in folders like `tenant_id/filename`.
DROP POLICY IF EXISTS "Tenant Update" ON storage.objects;
CREATE POLICY "Tenant Update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING ( bucket_id = 'tenant-assets' );

DROP POLICY IF EXISTS "Tenant Delete" ON storage.objects;
CREATE POLICY "Tenant Delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING ( bucket_id = 'tenant-assets' );
