-- Update phone constraint to be more specific for WhatsApp numbers
-- File: 042_update_phone_constraint_for_whatsapp.sql

-- Drop the existing phone constraint
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_phone_format;

-- Add a more specific constraint for WhatsApp numbers
-- WhatsApp numbers should start with + and contain only digits, spaces, parentheses, and hyphens
ALTER TABLE businesses 
ADD CONSTRAINT businesses_phone_format CHECK (
  phone IS NULL OR 
  phone = '' OR
  phone ~* '^\+[\d\s\(\)\-]{7,20}$'
);
