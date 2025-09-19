-- Add invoice status enhancements (status column already exists)
-- Migration: 031_add_invoice_status_enhancements.sql

-- Add status_updated_at column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE invoices ADD COLUMN status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create function to update status timestamp
CREATE OR REPLACE FUNCTION update_invoice_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update status timestamp (if it doesn't exist)
DROP TRIGGER IF EXISTS update_invoice_status_timestamp_trigger ON invoices;
CREATE TRIGGER update_invoice_status_timestamp_trigger
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status_timestamp();

-- Create function to automatically set overdue status
CREATE OR REPLACE FUNCTION check_overdue_invoices()
RETURNS void AS $$
BEGIN
  UPDATE invoices 
  SET status = 'overdue'
  WHERE status = 'sent' 
    AND due_date < CURRENT_DATE
    AND business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to get invoice status summary
CREATE OR REPLACE FUNCTION get_invoice_status_summary(business_uuid UUID)
RETURNS TABLE (
  status TEXT,
  count BIGINT,
  total_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.status::TEXT,
    COUNT(*) as count,
    COALESCE(SUM(i.total_amount), 0) as total_amount
  FROM invoices i
  WHERE i.business_id = business_uuid
  GROUP BY i.status
  ORDER BY i.status;
END;
$$ LANGUAGE plpgsql;
