-- Add business profile columns to businesses table
-- File: 040_add_business_profile_columns.sql

-- Add business profile columns
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US',
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add indexes for better performance on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_businesses_email ON businesses(email);
CREATE INDEX IF NOT EXISTS idx_businesses_country ON businesses(country);
CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city);

-- Add check constraints for data validation
ALTER TABLE businesses 
ADD CONSTRAINT businesses_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
ADD CONSTRAINT businesses_phone_format CHECK (phone IS NULL OR phone ~* '^[\+]?[1-9][\d]{0,15}$'),
ADD CONSTRAINT businesses_website_format CHECK (website IS NULL OR website ~* '^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$'),
ADD CONSTRAINT businesses_country_code CHECK (country IS NULL OR LENGTH(country) = 2);

-- Update the updated_at trigger to work with the new columns
-- (The existing trigger should already handle this, but let's make sure)
