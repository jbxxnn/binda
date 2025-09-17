-- Update transactions table for simplified business system
-- This modifies the existing transactions table to work with the simplified UI

-- First, let's backup any existing data by creating a backup table
CREATE TABLE IF NOT EXISTS transactions_backup AS SELECT * FROM transactions;

-- Drop the existing transactions table and recreate it with the simplified schema
DROP TABLE IF EXISTS transactions CASCADE;

-- Create the new simplified transactions table
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  category VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_business_id ON transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions
CREATE POLICY "Users can view their own business transactions" ON transactions
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert transactions for their own business" ON transactions
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own business transactions" ON transactions
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own business transactions" ON transactions
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );
