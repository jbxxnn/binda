-- Helper function to check if user belongs to a business
CREATE OR REPLACE FUNCTION user_belongs_to_business(business_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM business_users 
        WHERE business_id = business_uuid AND user_id = user_uuid
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Helper function to get user's role in a business
CREATE OR REPLACE FUNCTION get_user_business_role(business_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM business_users 
    WHERE business_id = business_uuid AND user_id = user_uuid;
    
    RETURN COALESCE(user_role, 'none');
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Helper function to check if user is business owner
CREATE OR REPLACE FUNCTION is_business_owner(business_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM businesses 
        WHERE id = business_uuid AND owner_id = user_uuid
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Helper function to get all businesses for a user
CREATE OR REPLACE FUNCTION get_user_businesses(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
    business_id UUID,
    business_name TEXT,
    business_slug TEXT,
    user_role TEXT,
    subscription_plan TEXT,
    subscription_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        b.slug,
        bu.role,
        b.subscription_plan,
        b.subscription_status
    FROM businesses b
    JOIN business_users bu ON b.id = bu.business_id
    WHERE bu.user_id = user_uuid;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Helper function to get business statistics
CREATE OR REPLACE FUNCTION get_business_stats(business_uuid UUID)
RETURNS TABLE (
    total_customers BIGINT,
    total_transactions BIGINT,
    total_revenue DECIMAL,
    pending_transactions BIGINT,
    completed_transactions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM customers WHERE business_id = business_uuid) as total_customers,
        (SELECT COUNT(*) FROM transactions WHERE business_id = business_uuid) as total_transactions,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE business_id = business_uuid AND status = 'completed') as total_revenue,
        (SELECT COUNT(*) FROM transactions WHERE business_id = business_uuid AND status = 'pending') as pending_transactions,
        (SELECT COUNT(*) FROM transactions WHERE business_id = business_uuid AND status = 'completed') as completed_transactions;
END;
$$ language 'plpgsql' SECURITY DEFINER;

