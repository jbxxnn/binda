-- Fix website format constraint to be more flexible
-- File: 041_fix_website_constraint.sql

-- Drop the existing website constraint
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_website_format;

-- Add a more flexible website constraint that allows:
-- - Optional http:// or https://
-- - Domain names with subdomains
-- - Various TLD formats
-- - Optional paths
ALTER TABLE businesses 
ADD CONSTRAINT businesses_website_format CHECK (
  website IS NULL OR 
  website = '' OR
  website ~* '^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$' OR
  website ~* '^[\w\.-]+\.[a-z]{2,}$'
);
