-- Default Categories and Account Mappings for New Businesses
-- File: 038_default_categories_and_mappings.sql

-- Function to create default categories for a business
CREATE OR REPLACE FUNCTION create_default_categories(business_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Only create categories if none exist
    IF NOT EXISTS (SELECT 1 FROM categories WHERE business_id = business_uuid) THEN
        
        -- INCOME CATEGORIES
        INSERT INTO categories (business_id, name, type, description, is_active) VALUES
        (business_uuid, 'Sales', 'income', 'Product sales and revenue', true),
        (business_uuid, 'Service Revenue', 'income', 'Service-based income', true),
        (business_uuid, 'Consulting', 'income', 'Consulting and advisory services', true),
        (business_uuid, 'Subscription', 'income', 'Recurring subscription revenue', true),
        (business_uuid, 'Other Income', 'income', 'Miscellaneous income', true);
        
        -- EXPENSE CATEGORIES
        INSERT INTO categories (business_id, name, type, description, is_active) VALUES
        (business_uuid, 'Office Supplies', 'expense', 'Office materials and supplies', true),
        (business_uuid, 'Rent', 'expense', 'Office rent and utilities', true),
        (business_uuid, 'Marketing', 'expense', 'Advertising and marketing costs', true),
        (business_uuid, 'Professional Services', 'expense', 'Legal, accounting, consulting fees', true),
        (business_uuid, 'Travel', 'expense', 'Business travel expenses', true),
        (business_uuid, 'Equipment', 'expense', 'Equipment purchases and maintenance', true),
        (business_uuid, 'Software', 'expense', 'Software subscriptions and licenses', true),
        (business_uuid, 'Insurance', 'expense', 'Business insurance premiums', true),
        (business_uuid, 'Utilities', 'expense', 'Electricity, water, internet, phone', true),
        (business_uuid, 'Other Expenses', 'expense', 'Miscellaneous business expenses', true);
        
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Enhanced function to create account mappings with better category matching
CREATE OR REPLACE FUNCTION create_enhanced_account_mappings(business_uuid UUID)
RETURNS VOID AS $$
DECLARE
    cash_account_id UUID;
    ar_account_id UUID;
    sales_revenue_id UUID;
    service_revenue_id UUID;
    consulting_revenue_id UUID;
    subscription_revenue_id UUID;
    other_income_id UUID;
    office_supplies_id UUID;
    rent_account_id UUID;
    marketing_id UUID;
    professional_services_id UUID;
    travel_id UUID;
    equipment_id UUID;
    software_id UUID;
    insurance_id UUID;
    utilities_id UUID;
    other_expenses_id UUID;
    cogs_account_id UUID;
BEGIN
    -- Get account IDs
    SELECT id INTO cash_account_id FROM accounts WHERE business_id = business_uuid AND account_code = '1000';
    SELECT id INTO ar_account_id FROM accounts WHERE business_id = business_uuid AND account_code = '1100';
    SELECT id INTO sales_revenue_id FROM accounts WHERE business_id = business_uuid AND account_code = '4000';
    SELECT id INTO service_revenue_id FROM accounts WHERE business_id = business_uuid AND account_code = '4100';
    SELECT id INTO cogs_account_id FROM accounts WHERE business_id = business_uuid AND account_code = '5000';
    SELECT id INTO office_supplies_id FROM accounts WHERE business_id = business_uuid AND account_code = '5100';
    SELECT id INTO rent_account_id FROM accounts WHERE business_id = business_uuid AND account_code = '5200';
    SELECT id INTO marketing_id FROM accounts WHERE business_id = business_uuid AND account_code = '5300';
    SELECT id INTO professional_services_id FROM accounts WHERE business_id = business_uuid AND account_code = '5400';
    
    -- Create additional expense accounts if they don't exist
    INSERT INTO accounts (business_id, account_code, account_name, account_type, description, is_active) VALUES
    (business_uuid, '5500', 'Travel Expenses', 'expense', 'Business travel costs', true),
    (business_uuid, '5600', 'Equipment', 'expense', 'Equipment purchases', true),
    (business_uuid, '5700', 'Software', 'expense', 'Software subscriptions', true),
    (business_uuid, '5800', 'Insurance', 'expense', 'Business insurance', true),
    (business_uuid, '5900', 'Utilities', 'expense', 'Utilities and services', true),
    (business_uuid, '5950', 'Other Expenses', 'expense', 'Miscellaneous expenses', true)
    ON CONFLICT (business_id, account_code) DO NOTHING;
    
    -- Get the new account IDs
    SELECT id INTO travel_id FROM accounts WHERE business_id = business_uuid AND account_code = '5500';
    SELECT id INTO equipment_id FROM accounts WHERE business_id = business_uuid AND account_code = '5600';
    SELECT id INTO software_id FROM accounts WHERE business_id = business_uuid AND account_code = '5700';
    SELECT id INTO insurance_id FROM accounts WHERE business_id = business_uuid AND account_code = '5800';
    SELECT id INTO utilities_id FROM accounts WHERE business_id = business_uuid AND account_code = '5900';
    SELECT id INTO other_expenses_id FROM accounts WHERE business_id = business_uuid AND account_code = '5950';
    
    -- Create comprehensive mapping rules for INCOME transactions
    INSERT INTO account_mapping_rules (business_id, transaction_type, category_name, account_id) VALUES
    (business_uuid, 'income', 'Sales', sales_revenue_id),
    (business_uuid, 'income', 'Service Revenue', service_revenue_id),
    (business_uuid, 'income', 'Consulting', service_revenue_id),
    (business_uuid, 'income', 'Subscription', service_revenue_id),
    (business_uuid, 'income', 'Other Income', service_revenue_id)
    ON CONFLICT (business_id, transaction_type, category_name) DO NOTHING;
    
    -- Create comprehensive mapping rules for EXPENSE transactions
    INSERT INTO account_mapping_rules (business_id, transaction_type, category_name, account_id) VALUES
    (business_uuid, 'expense', 'Office Supplies', office_supplies_id),
    (business_uuid, 'expense', 'Rent', rent_account_id),
    (business_uuid, 'expense', 'Marketing', marketing_id),
    (business_uuid, 'expense', 'Professional Services', professional_services_id),
    (business_uuid, 'expense', 'Travel', travel_id),
    (business_uuid, 'expense', 'Equipment', equipment_id),
    (business_uuid, 'expense', 'Software', software_id),
    (business_uuid, 'expense', 'Insurance', insurance_id),
    (business_uuid, 'expense', 'Utilities', utilities_id),
    (business_uuid, 'expense', 'Other Expenses', other_expenses_id)
    ON CONFLICT (business_id, transaction_type, category_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Master function to set up everything for a new business
CREATE OR REPLACE FUNCTION setup_new_business_accounting()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Create basic chart of accounts
    PERFORM create_basic_chart_of_accounts(NEW.id);
    
    -- 2. Create default categories
    PERFORM create_default_categories(NEW.id);
    
    -- 3. Create enhanced account mappings
    PERFORM create_enhanced_account_mappings(NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the trigger to use the comprehensive setup
DROP TRIGGER IF EXISTS setup_business_accounts_trigger ON businesses;
CREATE TRIGGER setup_business_accounts_trigger
    AFTER INSERT ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION setup_new_business_accounting();
