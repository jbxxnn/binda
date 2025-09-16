-- This file contains sample data for testing
-- Only run this in development environment

-- Insert sample business (only if running in development)
INSERT INTO businesses (id, name, slug, owner_id, subscription_plan, subscription_status, settings)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Sample Business',
    'sample-business',
    (SELECT id FROM auth.users LIMIT 1), -- This will use the first user in auth.users
    'free',
    'active',
    '{"currency": "USD", "timezone": "UTC", "invoice_prefix": "INV"}'
) ON CONFLICT (slug) DO NOTHING;

-- Insert sample customers
INSERT INTO customers (business_id, name, phone, email, notes)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'John Doe', '+1234567890', 'john@example.com', 'Regular customer'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Jane Smith', '+1234567891', 'jane@example.com', 'VIP customer'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Bob Johnson', '+1234567892', 'bob@example.com', 'New customer')
ON CONFLICT (business_id, phone) DO NOTHING;

-- Insert sample transactions
INSERT INTO transactions (business_id, customer_id, amount, type, description, date, status)
SELECT 
    '550e8400-e29b-41d4-a716-446655440000',
    c.id,
    CASE 
        WHEN c.name = 'John Doe' THEN 150.00
        WHEN c.name = 'Jane Smith' THEN 200.00
        WHEN c.name = 'Bob Johnson' THEN 75.00
    END,
    'sale',
    CASE 
        WHEN c.name = 'John Doe' THEN 'Product A - 2 units'
        WHEN c.name = 'Jane Smith' THEN 'Service B - 1 hour'
        WHEN c.name = 'Bob Johnson' THEN 'Product C - 1 unit'
    END,
    CURRENT_DATE - INTERVAL '1 day',
    'completed'
FROM customers c
WHERE c.business_id = '550e8400-e29b-41d4-a716-446655440000'
ON CONFLICT DO NOTHING;

-- Insert sample invoices
INSERT INTO invoices (business_id, transaction_id, invoice_number, sent_via, sent_at)
SELECT 
    '550e8400-e29b-41d4-a716-446655440000',
    t.id,
    'INV-000001',
    'email',
    NOW()
FROM transactions t
WHERE t.business_id = '550e8400-e29b-41d4-a716-446655440000'
LIMIT 1
ON CONFLICT (business_id, invoice_number) DO NOTHING;

