-- Auto-setup accounts for new businesses
-- File: 036_auto_setup_business_accounts.sql

-- Create trigger to automatically create basic accounts when a new business is created
CREATE OR REPLACE FUNCTION setup_business_accounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Create basic chart of accounts for the new business
    PERFORM create_basic_chart_of_accounts(NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS setup_business_accounts_trigger ON businesses;
CREATE TRIGGER setup_business_accounts_trigger
    AFTER INSERT ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION setup_business_accounts();
