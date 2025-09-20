-- Fix ambiguous balance_date reference in smart account mapping function
-- This fixes the error: column reference "balance_date" is ambiguous

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
