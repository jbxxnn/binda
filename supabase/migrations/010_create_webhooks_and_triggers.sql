-- Webhook functions and triggers for real-time updates

-- Function to notify about new customers
CREATE OR REPLACE FUNCTION notify_new_customer()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'new_customer',
        json_build_object(
            'business_id', NEW.business_id,
            'customer_id', NEW.id,
            'customer_name', NEW.name,
            'created_at', NEW.created_at
        )::text
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for new customer notifications
CREATE TRIGGER new_customer_notification
    AFTER INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_customer();

-- Function to notify about new transactions
CREATE OR REPLACE FUNCTION notify_new_transaction()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'new_transaction',
        json_build_object(
            'business_id', NEW.business_id,
            'transaction_id', NEW.id,
            'amount', NEW.amount,
            'type', NEW.type,
            'created_at', NEW.created_at
        )::text
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for new transaction notifications
CREATE TRIGGER new_transaction_notification
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_transaction();

-- Function to notify about new invoices
CREATE OR REPLACE FUNCTION notify_new_invoice()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'new_invoice',
        json_build_object(
            'business_id', NEW.business_id,
            'invoice_id', NEW.id,
            'invoice_number', NEW.invoice_number,
            'created_at', NEW.created_at
        )::text
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for new invoice notifications
CREATE TRIGGER new_invoice_notification
    AFTER INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_invoice();

-- Function to update business statistics when data changes
CREATE OR REPLACE FUNCTION update_business_stats()
RETURNS TRIGGER AS $$
DECLARE
    business_uuid UUID;
BEGIN
    -- Get business_id from the changed record
    IF TG_TABLE_NAME = 'customers' THEN
        business_uuid := NEW.business_id;
    ELSIF TG_TABLE_NAME = 'transactions' THEN
        business_uuid := NEW.business_id;
    ELSIF TG_TABLE_NAME = 'invoices' THEN
        business_uuid := NEW.business_id;
    END IF;
    
    -- Notify about business stats update
    PERFORM pg_notify(
        'business_stats_update',
        json_build_object(
            'business_id', business_uuid,
            'table', TG_TABLE_NAME,
            'action', TG_OP,
            'timestamp', NOW()
        )::text
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Triggers for business stats updates
CREATE TRIGGER update_business_stats_customers
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_business_stats();

CREATE TRIGGER update_business_stats_transactions
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_business_stats();

CREATE TRIGGER update_business_stats_invoices
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_business_stats();

-- Function to clean up old data (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Delete transactions older than 2 years that are cancelled
    DELETE FROM transactions 
    WHERE status = 'cancelled' 
    AND created_at < NOW() - INTERVAL '2 years';
    
    -- Delete customers with no transactions older than 1 year
    DELETE FROM customers 
    WHERE id NOT IN (
        SELECT DISTINCT customer_id FROM transactions WHERE customer_id IS NOT NULL
    )
    AND created_at < NOW() - INTERVAL '1 year';
    
    -- Log cleanup activity
    INSERT INTO business_stats_updates (business_id, action, details, created_at)
    SELECT 
        '00000000-0000-0000-0000-000000000000'::UUID,
        'cleanup',
        json_build_object(
            'deleted_cancelled_transactions', (SELECT COUNT(*) FROM transactions WHERE status = 'cancelled' AND created_at < NOW() - INTERVAL '2 years'),
            'deleted_orphaned_customers', (SELECT COUNT(*) FROM customers WHERE id NOT IN (SELECT DISTINCT customer_id FROM transactions WHERE customer_id IS NOT NULL) AND created_at < NOW() - INTERVAL '1 year')
        ),
        NOW();
END;
$$ language 'plpgsql' SECURITY DEFINER;

