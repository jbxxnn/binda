-- Balance Sheet System Migration
-- File: 033_create_balance_sheet_system.sql

-- 1. Create account_balances table to track account balances over time
CREATE TABLE IF NOT EXISTS account_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    balance_date DATE NOT NULL,
    balance_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, account_id, balance_date)
);

-- 2. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_account_balances_business_date ON account_balances(business_id, balance_date);
CREATE INDEX IF NOT EXISTS idx_account_balances_account ON account_balances(account_id);

-- 3. Create function to get balance sheet data for a specific date
CREATE OR REPLACE FUNCTION get_balance_sheet_data(
    business_uuid UUID,
    balance_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    account_type VARCHAR(20),
    account_name VARCHAR(100),
    account_code VARCHAR(20),
    balance_amount NUMERIC(15,2),
    parent_account_name VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.account_type,
        a.account_name,
        a.account_code,
        COALESCE(ab.balance_amount, 0) as balance_amount,
        pa.account_name as parent_account_name
    FROM accounts a
    LEFT JOIN account_balances ab ON a.id = ab.account_id 
        AND ab.business_id = business_uuid 
        AND ab.balance_date = balance_date
    LEFT JOIN accounts pa ON a.parent_account_id = pa.id
    WHERE a.business_id = business_uuid
    AND a.is_active = true
    ORDER BY a.account_type, a.account_code;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to calculate balance sheet summary
CREATE OR REPLACE FUNCTION get_balance_sheet_summary(
    business_uuid UUID,
    balance_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_assets NUMERIC(15,2),
    total_liabilities NUMERIC(15,2),
    total_equity NUMERIC(15,2),
    is_balanced BOOLEAN
) AS $$
DECLARE
    assets_total NUMERIC(15,2) := 0;
    liabilities_total NUMERIC(15,2) := 0;
    equity_total NUMERIC(15,2) := 0;
BEGIN
    -- Calculate total assets
    SELECT COALESCE(SUM(ab.balance_amount), 0) INTO assets_total
    FROM accounts a
    LEFT JOIN account_balances ab ON a.id = ab.account_id 
        AND ab.business_id = business_uuid 
        AND ab.balance_date = balance_date
    WHERE a.business_id = business_uuid
    AND a.account_type = 'asset'
    AND a.is_active = true;

    -- Calculate total liabilities
    SELECT COALESCE(SUM(ab.balance_amount), 0) INTO liabilities_total
    FROM accounts a
    LEFT JOIN account_balances ab ON a.id = ab.account_id 
        AND ab.business_id = business_uuid 
        AND ab.balance_date = balance_date
    WHERE a.business_id = business_uuid
    AND a.account_type = 'liability'
    AND a.is_active = true;

    -- Calculate total equity
    SELECT COALESCE(SUM(ab.balance_amount), 0) INTO equity_total
    FROM accounts a
    LEFT JOIN account_balances ab ON a.id = ab.account_id 
        AND ab.business_id = business_uuid 
        AND ab.balance_date = balance_date
    WHERE a.business_id = business_uuid
    AND a.account_type = 'equity'
    AND a.is_active = true;

    RETURN QUERY
    SELECT 
        assets_total,
        liabilities_total,
        equity_total,
        (ABS(assets_total - (liabilities_total + equity_total)) < 0.01) as is_balanced;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to initialize account balances from transactions
CREATE OR REPLACE FUNCTION initialize_account_balances_from_transactions(
    business_uuid UUID,
    balance_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
DECLARE
    account_record RECORD;
    account_balance NUMERIC(15,2);
BEGIN
    -- Loop through all accounts
    FOR account_record IN 
        SELECT id, account_type, account_code, account_name
        FROM accounts 
        WHERE business_id = business_uuid 
        AND is_active = true
    LOOP
        -- Calculate balance based on account type and transactions
        IF account_record.account_type IN ('asset', 'expense') THEN
            -- For assets and expenses, positive amounts increase balance
            SELECT COALESCE(SUM(
                CASE 
                    WHEN t.type = 'income' AND t.category = account_record.account_name THEN t.amount
                    WHEN t.type = 'expense' AND t.category = account_record.account_name THEN t.amount
                    ELSE 0
                END
            ), 0) INTO account_balance
            FROM transactions t
            WHERE t.business_id = business_uuid
            AND t.transaction_date <= balance_date;
        ELSE
            -- For liabilities, equity, and revenue, different calculation
            SELECT COALESCE(SUM(
                CASE 
                    WHEN t.type = 'income' AND t.category = account_record.account_name THEN t.amount
                    WHEN t.type = 'expense' AND t.category = account_record.account_name THEN -t.amount
                    ELSE 0
                END
            ), 0) INTO account_balance
            FROM transactions t
            WHERE t.business_id = business_uuid
            AND t.transaction_date <= balance_date;
        END IF;

        -- Insert or update account balance
        INSERT INTO account_balances (business_id, account_id, balance_date, balance_amount)
        VALUES (business_uuid, account_record.id, balance_date, account_balance)
        ON CONFLICT (business_id, account_id, balance_date)
        DO UPDATE SET 
            balance_amount = account_balance,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to get balance sheet by category
CREATE OR REPLACE FUNCTION get_balance_sheet_by_category(
    business_uuid UUID,
    balance_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    category VARCHAR(20),
    subcategory VARCHAR(100),
    amount NUMERIC(15,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH balance_data AS (
        SELECT 
            a.account_type,
            COALESCE(pa.account_name, a.account_name) as subcategory,
            COALESCE(ab.balance_amount, 0) as balance_amount
        FROM accounts a
        LEFT JOIN account_balances ab ON a.id = ab.account_id 
            AND ab.business_id = business_uuid 
            AND ab.balance_date = balance_date
        LEFT JOIN accounts pa ON a.parent_account_id = pa.id
        WHERE a.business_id = business_uuid
        AND a.is_active = true
    )
    SELECT 
        CASE 
            WHEN account_type = 'asset' THEN 'Assets'
            WHEN account_type = 'liability' THEN 'Liabilities'
            WHEN account_type = 'equity' THEN 'Equity'
            ELSE account_type
        END as category,
        subcategory,
        balance_amount as amount
    FROM balance_data
    WHERE balance_amount != 0
    ORDER BY 
        CASE account_type
            WHEN 'asset' THEN 1
            WHEN 'liability' THEN 2
            WHEN 'equity' THEN 3
            ELSE 4
        END,
        subcategory;
END;
$$ LANGUAGE plpgsql;

-- 7. Add RLS policies
ALTER TABLE account_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business account balances" ON account_balances
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their business account balances" ON account_balances
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their business account balances" ON account_balances
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their business account balances" ON account_balances
    FOR DELETE USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- 8. Create trigger to auto-update account balances when transactions change
CREATE OR REPLACE FUNCTION update_account_balances_on_transaction_change()
RETURNS TRIGGER AS $$
DECLARE
    business_uuid UUID;
    transaction_date DATE;
BEGIN
    -- Get business_id and transaction_date
    IF TG_OP = 'DELETE' THEN
        business_uuid := OLD.business_id;
        transaction_date := OLD.transaction_date;
    ELSE
        business_uuid := NEW.business_id;
        transaction_date := NEW.transaction_date;
    END IF;

    -- Recalculate account balances for this date and all future dates
    PERFORM initialize_account_balances_from_transactions(business_uuid, transaction_date);
    
    -- Also update future dates
    PERFORM initialize_account_balances_from_transactions(business_uuid, transaction_date + INTERVAL '1 day');
    PERFORM initialize_account_balances_from_transactions(business_uuid, transaction_date + INTERVAL '1 week');
    PERFORM initialize_account_balances_from_transactions(business_uuid, transaction_date + INTERVAL '1 month');

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_account_balances_trigger ON transactions;
CREATE TRIGGER update_account_balances_trigger
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balances_on_transaction_change();
