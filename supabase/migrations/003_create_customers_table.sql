-- Create customers table
CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure phone is unique within each business
    UNIQUE(business_id, phone)
);

-- Create indexes for faster lookups
CREATE INDEX idx_customers_business_id ON customers(business_id);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access customers from businesses they belong to
CREATE POLICY "Users can access customers from their businesses" ON customers
    FOR ALL USING (
        business_id IN (
            SELECT business_id FROM business_users WHERE user_id = auth.uid()
        )
    );

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

