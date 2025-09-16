-- Additional indexes for better performance

-- Composite indexes for common queries
CREATE INDEX idx_customers_business_name ON customers(business_id, name);
CREATE INDEX idx_customers_business_phone ON customers(business_id, phone);
CREATE INDEX idx_transactions_business_date ON transactions(business_id, date DESC);
CREATE INDEX idx_transactions_business_customer ON transactions(business_id, customer_id);
CREATE INDEX idx_transactions_business_status ON transactions(business_id, status);
CREATE INDEX idx_invoices_business_number ON invoices(business_id, invoice_number);

-- Full-text search indexes
CREATE INDEX idx_customers_name_search ON customers USING gin(to_tsvector('english', name));
CREATE INDEX idx_customers_notes_search ON customers USING gin(to_tsvector('english', notes));
CREATE INDEX idx_transactions_description_search ON transactions USING gin(to_tsvector('english', description));

-- Partial indexes for better performance
CREATE INDEX idx_transactions_pending ON transactions(business_id, created_at) WHERE status = 'pending';
CREATE INDEX idx_transactions_completed ON transactions(business_id, date DESC) WHERE status = 'completed';
CREATE INDEX idx_customers_active ON customers(business_id, name) WHERE phone IS NOT NULL;

-- Index for business_users role-based queries
CREATE INDEX idx_business_users_user_role ON business_users(user_id, role);

-- Index for business owner queries
CREATE INDEX idx_businesses_owner ON businesses(owner_id, created_at);

-- Statistics and monitoring
CREATE INDEX idx_transactions_amount_range ON transactions(business_id, amount) WHERE amount > 0;
CREATE INDEX idx_customers_created_recent ON customers(business_id, created_at) WHERE created_at > NOW() - INTERVAL '30 days';

-- Function to get business performance metrics
CREATE OR REPLACE FUNCTION get_business_performance_metrics(business_uuid UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    period_start DATE,
    period_end DATE,
    total_transactions BIGINT,
    total_revenue DECIMAL,
    average_transaction_value DECIMAL,
    new_customers BIGINT,
    returning_customers BIGINT,
    top_customer_name TEXT,
    top_customer_revenue DECIMAL
) AS $$
DECLARE
    start_date DATE := CURRENT_DATE - INTERVAL '1 day' * days_back;
    end_date DATE := CURRENT_DATE;
BEGIN
    RETURN QUERY
    WITH period_transactions AS (
        SELECT t.*, c.name as customer_name
        FROM transactions t
        LEFT JOIN customers c ON t.customer_id = c.id
        WHERE t.business_id = business_uuid 
        AND t.date >= start_date 
        AND t.date <= end_date
        AND t.status = 'completed'
    ),
    customer_totals AS (
        SELECT 
            customer_id,
            customer_name,
            SUM(amount) as customer_revenue
        FROM period_transactions
        GROUP BY customer_id, customer_name
    ),
    top_customer AS (
        SELECT customer_name, customer_revenue
        FROM customer_totals
        ORDER BY customer_revenue DESC
        LIMIT 1
    )
    SELECT 
        start_date,
        end_date,
        COUNT(pt.id) as total_transactions,
        COALESCE(SUM(pt.amount), 0) as total_revenue,
        COALESCE(AVG(pt.amount), 0) as average_transaction_value,
        COUNT(DISTINCT CASE WHEN c.created_at >= start_date THEN c.id END) as new_customers,
        COUNT(DISTINCT CASE WHEN c.created_at < start_date THEN c.id END) as returning_customers,
        (SELECT customer_name FROM top_customer) as top_customer_name,
        (SELECT customer_revenue FROM top_customer) as top_customer_revenue
    FROM period_transactions pt
    LEFT JOIN customers c ON pt.customer_id = c.id;
END;
$$ language 'plpgsql' SECURITY DEFINER;

