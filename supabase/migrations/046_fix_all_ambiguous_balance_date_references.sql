-- Fix all ambiguous balance_date references in all functions
-- This is a comprehensive fix for the transaction creation error

-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS update_account_balances_trigger ON transactions;
DROP FUNCTION IF EXISTS update_account_balances_for_transaction();

-- Recreate the function with proper column references
CREATE OR REPLACE FUNCTION update_account_balances_for_transaction()
RETURNS TRIGGER AS $$
DECLARE
    business_uuid UUID;
    cash_account_id UUID;
    mapped_account_id UUID;
    balance_date DATE;
    transaction_record RECORD;
BEGIN
    -- Get business_id from the transaction
    business_uuid := NEW.business_id;
    balance_date := NEW.transaction_date;
    
    -- Check if this business has accounting enabled
    IF NOT EXISTS (
        SELECT 1 FROM accounting_settings 
        WHERE business_id = business_uuid 
        AND fiscal_year_start IS NOT NULL
    ) THEN
        RETURN NEW;
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_account_balances_trigger
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balances_for_transaction();

-- Also fix the balance sheet functions that might have the same issue
CREATE OR REPLACE FUNCTION get_account_balance(
    business_uuid UUID,
    account_uuid UUID,
    balance_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    account_balance DECIMAL(15,2) := 0;
BEGIN
    SELECT COALESCE(ab.balance_amount, 0) INTO account_balance
    FROM account_balances ab
    WHERE ab.business_id = business_uuid 
    AND ab.account_id = account_uuid
    AND ab.balance_date = balance_date;
    
    RETURN account_balance;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_account_balances_summary(
    business_uuid UUID,
    balance_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_assets DECIMAL(15,2),
    total_liabilities DECIMAL(15,2),
    total_equity DECIMAL(15,2),
    is_balanced BOOLEAN
) AS $$
DECLARE
    assets_total DECIMAL(15,2) := 0;
    liabilities_total DECIMAL(15,2) := 0;
    equity_total DECIMAL(15,2) := 0;
BEGIN
    -- Get total assets
    SELECT COALESCE(SUM(ab.balance_amount), 0) INTO assets_total
    FROM account_balances ab
    JOIN chart_of_accounts coa ON ab.account_id = coa.id
    WHERE ab.business_id = business_uuid 
    AND coa.account_type = 'asset'
    AND ab.balance_date = balance_date;
    
    -- Get total liabilities
    SELECT COALESCE(SUM(ab.balance_amount), 0) INTO liabilities_total
    FROM account_balances ab
    JOIN chart_of_accounts coa ON ab.account_id = coa.id
    WHERE ab.business_id = business_uuid 
    AND coa.account_type = 'liability'
    AND ab.balance_date = balance_date;
    
    -- Get total equity
    SELECT COALESCE(SUM(ab.balance_amount), 0) INTO equity_total
    FROM account_balances ab
    JOIN chart_of_accounts coa ON ab.account_id = coa.id
    WHERE ab.business_id = business_uuid 
    AND coa.account_type = 'equity'
    AND ab.balance_date = balance_date;
    
    RETURN QUERY SELECT 
        assets_total,
        liabilities_total,
        equity_total,
        (assets_total = (liabilities_total + equity_total)) as is_balanced;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_account_balances_by_type(
    business_uuid UUID,
    account_type_param VARCHAR(20),
    balance_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    account_id UUID,
    account_name VARCHAR(255),
    account_code VARCHAR(50),
    balance_amount DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        coa.id as account_id,
        coa.account_name,
        coa.account_code,
        COALESCE(ab.balance_amount, 0) as balance_amount
    FROM chart_of_accounts coa
    LEFT JOIN account_balances ab ON (
        coa.id = ab.account_id 
        AND ab.business_id = business_uuid 
        AND ab.balance_date = balance_date
    )
    WHERE coa.business_id = business_uuid 
    AND coa.account_type = account_type_param
    ORDER BY coa.account_code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recalculate_account_balances(
    business_uuid UUID,
    balance_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
DECLARE
    account_record RECORD;
    account_balance DECIMAL(15,2);
BEGIN
    -- Clear existing balances for this date
    DELETE FROM account_balances 
    WHERE business_id = business_uuid 
    AND account_balances.balance_date = balance_date;
    
    -- Recalculate balances for each account
    FOR account_record IN 
        SELECT id FROM chart_of_accounts 
        WHERE business_id = business_uuid
    LOOP
        -- Calculate balance by summing all transactions up to the balance date
        SELECT COALESCE(SUM(
            CASE 
                WHEN t.type = 'income' AND coa.account_type IN ('asset', 'expense') THEN t.amount
                WHEN t.type = 'expense' AND coa.account_type IN ('liability', 'equity', 'revenue') THEN t.amount
                WHEN t.type = 'income' AND coa.account_type IN ('liability', 'equity', 'revenue') THEN -t.amount
                WHEN t.type = 'expense' AND coa.account_type IN ('asset', 'expense') THEN -t.amount
                ELSE 0
            END
        ), 0) INTO account_balance
        FROM transactions t
        JOIN get_account_mapping(business_uuid, t.type, t.category) AS mapped_account ON true
        JOIN chart_of_accounts coa ON mapped_account = coa.id
        WHERE t.business_id = business_uuid 
        AND coa.id = account_record.id
        AND t.transaction_date <= balance_date;
        
        -- Insert the calculated balance
        INSERT INTO account_balances (business_id, account_id, balance_date, balance_amount)
        VALUES (business_uuid, account_record.id, balance_date, account_balance);
    END LOOP;
END;
$$ LANGUAGE plpgsql;
