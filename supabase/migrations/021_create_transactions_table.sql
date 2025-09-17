-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  transaction_number VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('sale', 'service', 'refund', 'payment', 'other')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  payment_method VARCHAR(30) CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'check', 'other')),
  notes TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_business_id ON transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Create unique constraint for transaction numbers per business
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_business_number 
ON transactions(business_id, transaction_number);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view transactions for their businesses" ON transactions
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert transactions for their businesses" ON transactions
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update transactions for their businesses" ON transactions
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete transactions for their businesses" ON transactions
    FOR DELETE USING (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id = auth.uid()
        )
    );
