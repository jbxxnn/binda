-- Add subscription fields to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'none' 
CHECK (subscription_status IN ('none', 'active', 'paused', 'cancelled', 'expired')),
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(100),
ADD COLUMN IF NOT EXISTS subscription_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS subscription_currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS subscription_interval VARCHAR(20) DEFAULT 'monthly'
CHECK (subscription_interval IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
ADD COLUMN IF NOT EXISTS subscription_start_date DATE,
ADD COLUMN IF NOT EXISTS subscription_end_date DATE,
ADD COLUMN IF NOT EXISTS subscription_next_billing_date DATE,
ADD COLUMN IF NOT EXISTS subscription_auto_renew BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS subscription_notes TEXT;

-- Create indexes for subscription-related queries
CREATE INDEX IF NOT EXISTS idx_customers_subscription_status ON customers(subscription_status);
CREATE INDEX IF NOT EXISTS idx_customers_subscription_plan ON customers(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_customers_next_billing_date ON customers(subscription_next_billing_date);

-- Create a function to update subscription status based on dates
CREATE OR REPLACE FUNCTION update_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if subscription is active and has an end date
  IF NEW.subscription_status = 'active' AND NEW.subscription_end_date IS NOT NULL THEN
    -- Check if subscription has expired
    IF NEW.subscription_end_date < CURRENT_DATE THEN
      NEW.subscription_status = 'expired';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update subscription status
CREATE TRIGGER update_customers_subscription_status
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_status();

-- Create a function to get customers with upcoming billing dates
CREATE OR REPLACE FUNCTION get_customers_with_upcoming_billing(days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  subscription_plan TEXT,
  subscription_amount DECIMAL(10,2),
  subscription_currency VARCHAR(3),
  subscription_next_billing_date DATE,
  customer_email TEXT,
  customer_phone TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.subscription_plan,
    c.subscription_amount,
    c.subscription_currency,
    c.subscription_next_billing_date,
    c.email,
    c.phone
  FROM customers c
  WHERE c.subscription_status = 'active'
    AND c.subscription_next_billing_date IS NOT NULL
    AND c.subscription_next_billing_date <= CURRENT_DATE + INTERVAL '1 day' * days_ahead
    AND c.subscription_next_billing_date >= CURRENT_DATE
  ORDER BY c.subscription_next_billing_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get subscription analytics
CREATE OR REPLACE FUNCTION get_subscription_analytics(business_uuid UUID)
RETURNS TABLE (
  total_subscriptions INTEGER,
  active_subscriptions INTEGER,
  paused_subscriptions INTEGER,
  cancelled_subscriptions INTEGER,
  expired_subscriptions INTEGER,
  monthly_recurring_revenue DECIMAL(10,2),
  total_revenue DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_subscriptions,
    COUNT(CASE WHEN subscription_status = 'active' THEN 1 END)::INTEGER as active_subscriptions,
    COUNT(CASE WHEN subscription_status = 'paused' THEN 1 END)::INTEGER as paused_subscriptions,
    COUNT(CASE WHEN subscription_status = 'cancelled' THEN 1 END)::INTEGER as cancelled_subscriptions,
    COUNT(CASE WHEN subscription_status = 'expired' THEN 1 END)::INTEGER as expired_subscriptions,
    COALESCE(SUM(CASE WHEN subscription_status = 'active' AND subscription_interval = 'monthly' THEN subscription_amount END), 0) as monthly_recurring_revenue,
    COALESCE(SUM(CASE WHEN subscription_status = 'active' THEN subscription_amount END), 0) as total_revenue
  FROM customers
  WHERE business_id = business_uuid
    AND subscription_status != 'none';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
