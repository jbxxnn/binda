-- Smart Account Mapping System
-- File: 037_smart_account_mapping.sql

-- Create account mapping rules table
CREATE TABLE IF NOT EXISTS account_mapping_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    transaction_type VARCHAR(10) NOT NULL, -- 'income' or 'expense'
    category_name VARCHAR(100) NOT NULL,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, transaction_type, category_name)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_account_mapping_business ON account_mapping_rules(business_id);

-- Function to create default mapping rules for a business
CREATE OR REPLACE FUNCTION create_default_account_mappings(business_uuid UUID)
RETURNS VOID AS $$
DECLARE
    cash_account_id UUID;
    ar_account_id UUID;
    sales_revenue_id UUID;
    service_revenue_id UUID;
    cogs_account_id UUID;
    office_supplies_id UUID;
    rent_account_id UUID;
    marketing_id UUID;
    professional_services_id UUID;
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
    
    -- Create mapping rules for INCOME transactions
    INSERT INTO account_mapping_rules (business_id, transaction_type, category_name, account_id) VALUES
    (business_uuid, 'income', 'Sales', sales_revenue_id),
    (business_uuid, 'income', 'Service Revenue', service_revenue_id),
    (business_uuid, 'income', 'Consulting', service_revenue_id),
    (business_uuid, 'income', 'Product Sales', sales_revenue_id)
    ON CONFLICT (business_id, transaction_type, category_name) DO NOTHING;
    
    -- Create mapping rules for EXPENSE transactions
    INSERT INTO account_mapping_rules (business_id, transaction_type, category_name, account_id) VALUES
    (business_uuid, 'expense', 'Office Supplies', office_supplies_id),
    (business_uuid, 'expense', 'Rent', rent_account_id),
    (business_uuid, 'expense', 'Marketing', marketing_id),
    (business_uuid, 'expense', 'Professional Services', professional_services_id),
    (business_uuid, 'expense', 'Cost of Goods Sold', cogs_account_id),
    (business_uuid, 'expense', 'Utilities', rent_account_id)
    ON CONFLICT (business_id, transaction_type, category_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to get account mapping for a transaction
CREATE OR REPLACE FUNCTION get_account_mapping(
    business_uuid UUID,
    transaction_type VARCHAR(10),
    category_name VARCHAR(100)
)
RETURNS UUID AS $$
DECLARE
    mapped_account_id UUID;
    default_cash_id UUID;
    default_revenue_id UUID;
    default_expense_id UUID;
BEGIN
    -- Try to find specific mapping
    SELECT account_id INTO mapped_account_id
    FROM account_mapping_rules
    WHERE business_id = business_uuid
    AND transaction_type = get_account_mapping.transaction_type
    AND category_name = get_account_mapping.category_name;
    
    -- If no specific mapping found, use defaults
    IF mapped_account_id IS NULL THEN
        IF transaction_type = 'income' THEN
            -- Default income goes to Sales Revenue
            SELECT id INTO mapped_account_id
            FROM accounts
            WHERE business_id = business_uuid
            AND account_type = 'revenue'
            AND account_code = '4000'
            LIMIT 1;
        ELSE
            -- Default expense goes to Office Supplies
            SELECT id INTO mapped_account_id
            FROM accounts
            WHERE business_id = business_uuid
            AND account_type = 'expense'
            AND account_code = '5100'
            LIMIT 1;
        END IF;
    END IF;
    
    RETURN mapped_account_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get cash account for a business
CREATE OR REPLACE FUNCTION get_cash_account(business_uuid UUID)
RETURNS UUID AS $$
DECLARE
    cash_account_id UUID;
BEGIN
    SELECT id INTO cash_account_id
    FROM accounts
    WHERE business_id = business_uuid
    AND account_type = 'asset'
    AND account_code = '1000'
    LIMIT 1;
    
    RETURN cash_account_id;
END;
$$ LANGUAGE plpgsql;

-- Enhanced function to update account balances with proper double-entry
CREATE OR REPLACE FUNCTION update_account_balances_with_double_entry()
RETURNS TRIGGER AS $$
DECLARE
    business_uuid UUID;
    balance_date DATE;
    transaction_record RECORD;
    cash_account_id UUID;
    mapped_account_id UUID;
    cash_balance NUMERIC(15,2) := 0;
    mapped_balance NUMERIC(15,2) := 0;
BEGIN
    -- Get business_id and transaction_date from the trigger context
    IF TG_OP = 'DELETE' THEN
        business_uuid := OLD.business_id;
        balance_date := OLD.transaction_date;
    ELSE
        business_uuid := NEW.business_id;
        balance_date := NEW.transaction_date;
    END IF;
    
    -- Get cash account
    cash_account_id := get_cash_account(business_uuid);
    
    -- Reset all balances to zero first
    UPDATE account_balances 
    SET balance_amount = 0
    WHERE business_id = business_uuid 
    AND account_balances.balance_date = balance_date;
    
    -- Process each transaction
    FOR transaction_record IN 
        SELECT t.*, 
               get_account_mapping(business_uuid, t.type, t.category) as mapped_account
        FROM transactions t
        WHERE t.business_id = business_uuid
        AND t.transaction_date <= balance_date
        ORDER BY t.transaction_date
    LOOP
        mapped_account_id := transaction_record.mapped_account;
        
        IF transaction_record.type = 'income' THEN
            -- Income: Debit Cash, Credit Revenue
            -- Update cash (asset - debit increases)
            INSERT INTO account_balances (business_id, account_id, balance_date, balance_amount)
            VALUES (business_uuid, cash_account_id, balance_date, 
                   COALESCE((SELECT balance_amount FROM account_balances 
                            WHERE business_id = business_uuid AND account_id = cash_account_id 
                            AND account_balances.balance_date = balance_date), 0) + transaction_record.amount)
            ON CONFLICT (business_id, account_id, balance_date)
            DO UPDATE SET balance_amount = account_balances.balance_amount + transaction_record.amount;
            
            -- Update revenue account (revenue - credit increases)
            INSERT INTO account_balances (business_id, account_id, balance_date, balance_amount)
            VALUES (business_uuid, mapped_account_id, balance_date, 
                   COALESCE((SELECT balance_amount FROM account_balances 
                            WHERE business_id = business_uuid AND account_id = mapped_account_id 
                            AND account_balances.balance_date = balance_date), 0) + transaction_record.amount)
            ON CONFLICT (business_id, account_id, balance_date)
            DO UPDATE SET balance_amount = account_balances.balance_amount + transaction_record.amount;
            
        ELSE -- expense
            -- Expense: Debit Expense, Credit Cash
            -- Update expense account (expense - debit increases)
            INSERT INTO account_balances (business_id, account_id, balance_date, balance_amount)
            VALUES (business_uuid, mapped_account_id, balance_date, 
                   COALESCE((SELECT balance_amount FROM account_balances 
                            WHERE business_id = business_uuid AND account_id = mapped_account_id 
                            AND account_balances.balance_date = balance_date), 0) + transaction_record.amount)
            ON CONFLICT (business_id, account_id, balance_date)
            DO UPDATE SET balance_amount = account_balances.balance_amount + transaction_record.amount;
            
            -- Update cash (asset - credit decreases)
            INSERT INTO account_balances (business_id, account_id, balance_date, balance_amount)
            VALUES (business_uuid, cash_account_id, balance_date, 
                   COALESCE((SELECT balance_amount FROM account_balances 
                            WHERE business_id = business_uuid AND account_id = cash_account_id 
                            AND account_balances.balance_date = balance_date), 0) - transaction_record.amount)
            ON CONFLICT (business_id, account_id, balance_date)
            DO UPDATE SET balance_amount = account_balances.balance_amount - transaction_record.amount;
        END IF;
    END LOOP;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE account_mapping_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business account mappings" ON account_mapping_rules
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their business account mappings" ON account_mapping_rules
    FOR ALL USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Update the trigger to use the new double-entry system
DROP TRIGGER IF EXISTS update_account_balances_trigger ON transactions;
CREATE TRIGGER update_account_balances_trigger
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balances_with_double_entry();
