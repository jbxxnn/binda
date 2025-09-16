-- Create useful views for the application

-- View for customer details with transaction summary
CREATE VIEW customer_details AS
SELECT 
    c.id,
    c.business_id,
    c.name,
    c.phone,
    c.email,
    c.notes,
    c.created_at,
    c.updated_at,
    COUNT(t.id) as total_transactions,
    COALESCE(SUM(t.amount), 0) as total_spent,
    MAX(t.date) as last_transaction_date,
    MIN(t.date) as first_transaction_date
FROM customers c
LEFT JOIN transactions t ON c.id = t.customer_id AND t.status = 'completed'
GROUP BY c.id, c.business_id, c.name, c.phone, c.email, c.notes, c.created_at, c.updated_at;

-- Enable RLS on the view
ALTER VIEW customer_details SET (security_invoker = true);

-- View for transaction details with customer information
CREATE VIEW transaction_details AS
SELECT 
    t.id,
    t.business_id,
    t.customer_id,
    c.name as customer_name,
    c.phone as customer_phone,
    c.email as customer_email,
    t.amount,
    t.type,
    t.description,
    t.date,
    t.status,
    t.created_at,
    t.updated_at,
    i.invoice_number,
    i.sent_via,
    i.sent_at
FROM transactions t
LEFT JOIN customers c ON t.customer_id = c.id
LEFT JOIN invoices i ON t.id = i.transaction_id;

-- Enable RLS on the view
ALTER VIEW transaction_details SET (security_invoker = true);

-- View for business dashboard statistics
CREATE VIEW business_dashboard_stats AS
SELECT 
    b.id as business_id,
    b.name as business_name,
    b.slug as business_slug,
    b.subscription_plan,
    b.subscription_status,
    COUNT(DISTINCT c.id) as total_customers,
    COUNT(DISTINCT t.id) as total_transactions,
    COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.amount ELSE 0 END), 0) as total_revenue,
    COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_transactions,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_transactions,
    COUNT(CASE WHEN t.status = 'cancelled' THEN 1 END) as cancelled_transactions,
    COALESCE(AVG(CASE WHEN t.status = 'completed' THEN t.amount END), 0) as average_transaction_value,
    MAX(t.date) as last_transaction_date,
    MIN(t.date) as first_transaction_date
FROM businesses b
LEFT JOIN customers c ON b.id = c.business_id
LEFT JOIN transactions t ON b.id = t.business_id
GROUP BY b.id, b.name, b.slug, b.subscription_plan, b.subscription_status;

-- Enable RLS on the view
ALTER VIEW business_dashboard_stats SET (security_invoker = true);

-- View for recent activity
CREATE VIEW recent_activity AS
SELECT 
    'customer' as type,
    c.business_id,
    c.id as record_id,
    c.name as title,
    'Customer added' as description,
    c.created_at
FROM customers c
UNION ALL
SELECT 
    'transaction' as type,
    t.business_id,
    t.id as record_id,
    CONCAT('Transaction: ', t.description) as title,
    CONCAT('Amount: $', t.amount, ' - ', t.status) as description,
    t.created_at
FROM transactions t
UNION ALL
SELECT 
    'invoice' as type,
    i.business_id,
    i.id as record_id,
    CONCAT('Invoice: ', i.invoice_number) as title,
    CONCAT('Sent via: ', COALESCE(i.sent_via, 'not sent')) as description,
    i.created_at
FROM invoices i
ORDER BY created_at DESC;

-- Enable RLS on the view
ALTER VIEW recent_activity SET (security_invoker = true);

