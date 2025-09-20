-- Create accounting_settings table
CREATE TABLE IF NOT EXISTS accounting_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  fiscal_year_start DATE NOT NULL DEFAULT '2024-01-01',
  default_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  invoice_prefix VARCHAR(10) NOT NULL DEFAULT 'INV',
  invoice_numbering VARCHAR(20) NOT NULL DEFAULT 'sequential' CHECK (invoice_numbering IN ('sequential', 'date_based')),
  invoice_start_number INTEGER NOT NULL DEFAULT 1,
  quote_prefix VARCHAR(10) NOT NULL DEFAULT 'QUO',
  quote_numbering VARCHAR(20) NOT NULL DEFAULT 'sequential' CHECK (quote_numbering IN ('sequential', 'date_based')),
  quote_start_number INTEGER NOT NULL DEFAULT 1,
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  late_fee_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  late_fee_type VARCHAR(20) NOT NULL DEFAULT 'percentage' CHECK (late_fee_type IN ('percentage', 'fixed')),
  auto_send_reminders BOOLEAN NOT NULL DEFAULT false,
  reminder_days_before_due INTEGER NOT NULL DEFAULT 7,
  reminder_days_after_due INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id)
);

-- Enable RLS
ALTER TABLE accounting_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own accounting settings" ON accounting_settings
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own accounting settings" ON accounting_settings
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own accounting settings" ON accounting_settings
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own accounting settings" ON accounting_settings
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_accounting_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_accounting_settings_updated_at
  BEFORE UPDATE ON accounting_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_accounting_settings_updated_at();

-- Create function to get or create accounting settings for a business
CREATE OR REPLACE FUNCTION get_or_create_accounting_settings(business_uuid UUID)
RETURNS accounting_settings AS $$
DECLARE
  settings accounting_settings;
BEGIN
  -- Try to get existing settings
  SELECT * INTO settings
  FROM accounting_settings
  WHERE business_id = business_uuid;
  
  -- If no settings exist, create default ones
  IF NOT FOUND THEN
    INSERT INTO accounting_settings (
      business_id,
      fiscal_year_start,
      default_currency,
      tax_rate,
      invoice_prefix,
      invoice_numbering,
      invoice_start_number,
      quote_prefix,
      quote_numbering,
      quote_start_number,
      payment_terms_days,
      late_fee_rate,
      late_fee_type,
      auto_send_reminders,
      reminder_days_before_due,
      reminder_days_after_due
    ) VALUES (
      business_uuid,
      '2024-01-01',
      'USD',
      0.00,
      'INV',
      'sequential',
      1,
      'QUO',
      'sequential',
      1,
      30,
      0.00,
      'percentage',
      false,
      7,
      3
    ) RETURNING * INTO settings;
  END IF;
  
  RETURN settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
