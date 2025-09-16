-- Create invoices table
CREATE TABLE invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT NOT NULL,
    pdf_path TEXT,
    sent_via TEXT CHECK (sent_via IN ('email', 'whatsapp', 'print')),
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure invoice_number is unique within each business
    UNIQUE(business_id, invoice_number)
);

-- Create indexes for faster lookups
CREATE INDEX idx_invoices_business_id ON invoices(business_id);
CREATE INDEX idx_invoices_transaction_id ON invoices(transaction_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_sent_via ON invoices(sent_via);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access invoices from businesses they belong to
CREATE POLICY "Users can access invoices from their businesses" ON invoices
    FOR ALL USING (
        business_id IN (
            SELECT business_id FROM business_users WHERE user_id = auth.uid()
        )
    );

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(business_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    invoice_number TEXT;
BEGIN
    -- Get the next invoice number for this business
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-(\d+)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM invoices
    WHERE business_id = business_uuid;
    
    -- Format as INV-000001, INV-000002, etc.
    invoice_number := 'INV-' || LPAD(next_number::TEXT, 6, '0');
    
    RETURN invoice_number;
END;
$$ language 'plpgsql';

-- Function to automatically generate invoice number on insert
CREATE OR REPLACE FUNCTION auto_generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number := generate_invoice_number(NEW.business_id);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically generate invoice number
CREATE TRIGGER auto_generate_invoice_number_trigger
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_invoice_number();

