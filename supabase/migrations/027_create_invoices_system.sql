-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoice_items table for line items
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own business invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert invoices for their own business" ON invoices;
DROP POLICY IF EXISTS "Users can update their own business invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete their own business invoices" ON invoices;
DROP POLICY IF EXISTS "Users can view invoice items for their own business invoices" ON invoice_items;
DROP POLICY IF EXISTS "Users can insert invoice items for their own business invoices" ON invoice_items;
DROP POLICY IF EXISTS "Users can update invoice items for their own business invoices" ON invoice_items;
DROP POLICY IF EXISTS "Users can delete invoice items for their own business invoices" ON invoice_items;

-- RLS Policies for invoices
CREATE POLICY "Users can view their own business invoices" ON invoices
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert invoices for their own business" ON invoices
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own business invoices" ON invoices
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own business invoices" ON invoices
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- RLS Policies for invoice_items
CREATE POLICY "Users can view invoice items for their own business invoices" ON invoice_items
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert invoice items for their own business invoices" ON invoice_items
  FOR INSERT WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices WHERE business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update invoice items for their own business invoices" ON invoice_items
  FOR UPDATE USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete invoice items for their own business invoices" ON invoice_items
  FOR DELETE USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
      )
    )
  );

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(business_uuid UUID)
RETURNS VARCHAR AS $$
DECLARE
  next_number INTEGER;
  result_invoice_number VARCHAR(50);
BEGIN
  -- Check if invoices table exists and has data
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    -- Get the next invoice number for this business
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoices.invoice_number FROM 'INV-(\d+)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM invoices
    WHERE invoices.business_id = business_uuid
    AND invoices.invoice_number ~ '^INV-\d+$';
  ELSE
    -- Table doesn't exist yet, start with 1
    next_number := 1;
  END IF;
  
  -- Format as INV-0001, INV-0002, etc.
  result_invoice_number := 'INV-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN result_invoice_number;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error, return a default invoice number
    RETURN 'INV-0001';
END;
$$ LANGUAGE plpgsql;

-- Function to calculate invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals(invoice_uuid UUID)
RETURNS VOID AS $$
DECLARE
  invoice_record RECORD;
  calculated_subtotal DECIMAL(15,2);
  calculated_tax_amount DECIMAL(15,2);
  calculated_total_amount DECIMAL(15,2);
BEGIN
  -- Get invoice details
  SELECT * INTO invoice_record FROM invoices WHERE id = invoice_uuid;
  
  -- Calculate subtotal from invoice items
  SELECT COALESCE(SUM(total_price), 0) INTO calculated_subtotal
  FROM invoice_items
  WHERE invoice_id = invoice_uuid;
  
  -- Calculate tax amount
  calculated_tax_amount := calculated_subtotal * (invoice_record.tax_rate / 100);
  
  -- Calculate total amount
  calculated_total_amount := calculated_subtotal + calculated_tax_amount;
  
  -- Update invoice totals
  UPDATE invoices
  SET 
    subtotal = calculated_subtotal,
    tax_amount = calculated_tax_amount,
    total_amount = calculated_total_amount,
    updated_at = NOW()
  WHERE id = invoice_uuid;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate totals when invoice items change
CREATE OR REPLACE FUNCTION trigger_calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_invoice_totals(COALESCE(NEW.invoice_id, OLD.invoice_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS calculate_invoice_totals_trigger ON invoice_items;

CREATE TRIGGER calculate_invoice_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_invoice_totals();
