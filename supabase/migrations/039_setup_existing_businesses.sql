-- Setup existing businesses with complete accounting system
-- File: 039_setup_existing_businesses.sql

-- Function to set up existing businesses (run this once for your current business)
CREATE OR REPLACE FUNCTION setup_existing_businesses()
RETURNS VOID AS $$
DECLARE
    business_record RECORD;
BEGIN
    -- Loop through all existing businesses and set them up
    FOR business_record IN 
        SELECT id FROM businesses
    LOOP
        -- Set up complete accounting system using the individual functions
        PERFORM create_basic_chart_of_accounts(business_record.id);
        PERFORM create_default_categories(business_record.id);
        PERFORM create_enhanced_account_mappings(business_record.id);
        
        -- Log the setup
        RAISE NOTICE 'Set up accounting system for business: %', business_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the setup for all existing businesses
SELECT setup_existing_businesses();
