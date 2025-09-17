-- Fix simplified business management tables
-- Handle existing policies and ensure tables exist

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own business categories" ON categories;
DROP POLICY IF EXISTS "Users can insert categories for their own business" ON categories;
DROP POLICY IF EXISTS "Users can update their own business categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their own business categories" ON categories;
DROP POLICY IF EXISTS "Users can view their own business transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert transactions for their own business" ON transactions;
DROP POLICY IF EXISTS "Users can update their own business transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own business transactions" ON transactions;

-- Ensure categories table exists
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure transactions table exists
CREATE TABLE IF NOT EXISTS transactions (
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
CREATE INDEX IF NOT EXISTS idx_categories_business_id ON categories(business_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_transactions_business_id ON transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Users can view their own business categories" ON categories
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert categories for their own business" ON categories
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own business categories" ON categories
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own business categories" ON categories
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

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

-- Function to create default categories for a business
CREATE OR REPLACE FUNCTION create_default_categories(business_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Income Categories
  INSERT INTO categories (business_id, name, type, description, is_active) VALUES
  (business_uuid, 'Sales Revenue', 'income', 'Money from selling products or services', true),
  (business_uuid, 'Service Revenue', 'income', 'Money from providing services', true),
  (business_uuid, 'Product Sales', 'income', 'Money from selling physical products', true),
  (business_uuid, 'Consulting', 'income', 'Money from consulting services', true),
  (business_uuid, 'Other Income', 'income', 'Other sources of income', true),
  
  -- Expense Categories
  (business_uuid, 'Rent & Utilities', 'expense', 'Office rent, electricity, water, internet', true),
  (business_uuid, 'Supplies & Inventory', 'expense', 'Office supplies, raw materials, inventory', true),
  (business_uuid, 'Staff & Payroll', 'expense', 'Employee salaries, benefits, contractors', true),
  (business_uuid, 'Marketing & Advertising', 'expense', 'Ads, social media, promotional materials', true),
  (business_uuid, 'Equipment & Tools', 'expense', 'Computers, machinery, tools, software', true),
  (business_uuid, 'Insurance', 'expense', 'Business insurance, liability coverage', true),
  (business_uuid, 'Professional Services', 'expense', 'Accountant, lawyer, consultant fees', true),
  (business_uuid, 'Other Expenses', 'expense', 'Miscellaneous business expenses', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_default_categories(UUID) TO authenticated;
