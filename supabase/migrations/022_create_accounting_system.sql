-- Create Chart of Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  account_code VARCHAR(10) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  parent_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Journal Entries table (replaces simple transactions)
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  entry_number VARCHAR(50) NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT,
  reference VARCHAR(100), -- Invoice number, check number, etc.
  total_debit DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
  is_posted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_balanced_entries CHECK (total_debit = total_credit)
);

-- Create Journal Entry Lines table (the actual debits and credits)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  description TEXT,
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_debit_or_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR 
    (debit_amount = 0 AND credit_amount > 0)
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_accounts_business_id ON accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_journal_entries_business_id ON journal_entries(business_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_journal_entry_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_id ON journal_entry_lines(account_id);

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_business_code 
ON accounts(business_id, account_code);

CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_business_number 
ON journal_entries(business_id, entry_number);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_accounts_updated_at 
    BEFORE UPDATE ON accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at 
    BEFORE UPDATE ON journal_entries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for accounts
CREATE POLICY "Users can view accounts for their businesses" ON accounts
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert accounts for their businesses" ON accounts
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update accounts for their businesses" ON accounts
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete accounts for their businesses" ON accounts
    FOR DELETE USING (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id = auth.uid()
        )
    );

-- Create RLS policies for journal_entries
CREATE POLICY "Users can view journal entries for their businesses" ON journal_entries
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert journal entries for their businesses" ON journal_entries
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update journal entries for their businesses" ON journal_entries
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete journal entries for their businesses" ON journal_entries
    FOR DELETE USING (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id = auth.uid()
        )
    );

-- Create RLS policies for journal_entry_lines
CREATE POLICY "Users can view journal entry lines for their businesses" ON journal_entry_lines
    FOR SELECT USING (
        journal_entry_id IN (
            SELECT id FROM journal_entries 
            WHERE business_id IN (
                SELECT id FROM businesses 
                WHERE owner_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert journal entry lines for their businesses" ON journal_entry_lines
    FOR INSERT WITH CHECK (
        journal_entry_id IN (
            SELECT id FROM journal_entries 
            WHERE business_id IN (
                SELECT id FROM businesses 
                WHERE owner_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update journal entry lines for their businesses" ON journal_entry_lines
    FOR UPDATE USING (
        journal_entry_id IN (
            SELECT id FROM journal_entries 
            WHERE business_id IN (
                SELECT id FROM businesses 
                WHERE owner_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete journal entry lines for their businesses" ON journal_entry_lines
    FOR DELETE USING (
        journal_entry_id IN (
            SELECT id FROM journal_entries 
            WHERE business_id IN (
                SELECT id FROM businesses 
                WHERE owner_id = auth.uid()
            )
        )
    );

-- Function to create default chart of accounts for a new business
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts(business_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Assets
  INSERT INTO accounts (business_id, account_code, account_name, account_type, description) VALUES
  (business_uuid, '1000', 'Cash', 'asset', 'Cash on hand and in bank accounts'),
  (business_uuid, '1100', 'Accounts Receivable', 'asset', 'Money owed by customers'),
  (business_uuid, '1200', 'Inventory', 'asset', 'Goods held for sale'),
  (business_uuid, '1300', 'Equipment', 'asset', 'Office equipment and machinery'),
  (business_uuid, '1400', 'Furniture', 'asset', 'Office furniture and fixtures'),
  (business_uuid, '1500', 'Prepaid Expenses', 'asset', 'Expenses paid in advance');

  -- Liabilities
  INSERT INTO accounts (business_id, account_code, account_name, account_type, description) VALUES
  (business_uuid, '2000', 'Accounts Payable', 'liability', 'Money owed to suppliers'),
  (business_uuid, '2100', 'Accrued Expenses', 'liability', 'Expenses incurred but not yet paid'),
  (business_uuid, '2200', 'Loans Payable', 'liability', 'Outstanding loans and debts'),
  (business_uuid, '2300', 'Taxes Payable', 'liability', 'Taxes owed to government');

  -- Equity
  INSERT INTO accounts (business_id, account_code, account_name, account_type, description) VALUES
  (business_uuid, '3000', 'Owner Equity', 'equity', 'Owner investment in the business'),
  (business_uuid, '3100', 'Retained Earnings', 'equity', 'Accumulated profits');

  -- Revenue
  INSERT INTO accounts (business_id, account_code, account_name, account_type, description) VALUES
  (business_uuid, '4000', 'Sales Revenue', 'revenue', 'Income from sales of goods/services'),
  (business_uuid, '4100', 'Service Revenue', 'revenue', 'Income from services provided'),
  (business_uuid, '4200', 'Interest Income', 'revenue', 'Interest earned on investments');

  -- Expenses
  INSERT INTO accounts (business_id, account_code, account_name, account_type, description) VALUES
  (business_uuid, '5000', 'Cost of Goods Sold', 'expense', 'Direct costs of producing goods'),
  (business_uuid, '5100', 'Salaries & Wages', 'expense', 'Employee compensation'),
  (business_uuid, '5200', 'Rent Expense', 'expense', 'Office and facility rent'),
  (business_uuid, '5300', 'Utilities', 'expense', 'Electricity, water, internet, etc.'),
  (business_uuid, '5400', 'Office Supplies', 'expense', 'Office materials and supplies'),
  (business_uuid, '5500', 'Marketing', 'expense', 'Advertising and promotional costs'),
  (business_uuid, '5600', 'Professional Services', 'expense', 'Legal, accounting, consulting fees'),
  (business_uuid, '5700', 'Insurance', 'expense', 'Business insurance premiums'),
  (business_uuid, '5800', 'Depreciation', 'expense', 'Depreciation of fixed assets'),
  (business_uuid, '5900', 'Miscellaneous', 'expense', 'Other business expenses');
END;
$$ LANGUAGE plpgsql;
