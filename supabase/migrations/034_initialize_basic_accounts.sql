-- Initialize Basic Chart of Accounts
-- File: 034_initialize_basic_accounts.sql

-- This function creates basic accounts for businesses that don't have any yet
CREATE OR REPLACE FUNCTION create_basic_chart_of_accounts(business_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Only create accounts if none exist
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE business_id = business_uuid) THEN
        
        -- ASSETS
        INSERT INTO accounts (business_id, account_code, account_name, account_type, description, is_active) VALUES
        (business_uuid, '1000', 'Cash', 'asset', 'Cash on hand and in bank accounts', true),
        (business_uuid, '1100', 'Accounts Receivable', 'asset', 'Money owed by customers', true),
        (business_uuid, '1200', 'Inventory', 'asset', 'Products for sale', true),
        (business_uuid, '1300', 'Equipment', 'asset', 'Business equipment and tools', true),
        (business_uuid, '1400', 'Furniture', 'asset', 'Office furniture and fixtures', true);
        
        -- LIABILITIES
        INSERT INTO accounts (business_id, account_code, account_name, account_type, description, is_active) VALUES
        (business_uuid, '2000', 'Accounts Payable', 'liability', 'Money owed to suppliers', true),
        (business_uuid, '2100', 'Credit Card Payable', 'liability', 'Outstanding credit card balances', true),
        (business_uuid, '2200', 'Loans Payable', 'liability', 'Business loans and debt', true);
        
        -- EQUITY
        INSERT INTO accounts (business_id, account_code, account_name, account_type, description, is_active) VALUES
        (business_uuid, '3000', 'Owner Capital', 'equity', 'Initial investment by owner', true),
        (business_uuid, '3100', 'Retained Earnings', 'equity', 'Accumulated profits', true);
        
        -- REVENUE
        INSERT INTO accounts (business_id, account_code, account_name, account_type, description, is_active) VALUES
        (business_uuid, '4000', 'Sales Revenue', 'revenue', 'Income from sales', true),
        (business_uuid, '4100', 'Service Revenue', 'revenue', 'Income from services', true);
        
        -- EXPENSES
        INSERT INTO accounts (business_id, account_code, account_name, account_type, description, is_active) VALUES
        (business_uuid, '5000', 'Cost of Goods Sold', 'expense', 'Direct costs of products sold', true),
        (business_uuid, '5100', 'Office Supplies', 'expense', 'Office supplies and materials', true),
        (business_uuid, '5200', 'Rent', 'expense', 'Office rent and utilities', true),
        (business_uuid, '5300', 'Marketing', 'expense', 'Advertising and marketing costs', true),
        (business_uuid, '5400', 'Professional Services', 'expense', 'Legal, accounting, consulting fees', true);
        
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a function to initialize account balances for existing businesses
CREATE OR REPLACE FUNCTION initialize_all_business_accounts()
RETURNS VOID AS $$
DECLARE
    business_record RECORD;
BEGIN
    -- Loop through all businesses and create basic accounts if they don't have any
    FOR business_record IN 
        SELECT id FROM businesses
    LOOP
        PERFORM create_basic_chart_of_accounts(business_record.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Note: This function will be called automatically when new businesses are created
-- No need to run it for existing businesses to avoid interfering with their data
