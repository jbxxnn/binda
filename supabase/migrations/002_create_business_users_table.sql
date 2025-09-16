-- Create business_users table (many-to-many relationship)
CREATE TABLE business_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'employee' CHECK (role IN ('owner', 'admin', 'employee')),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique user per business
    UNIQUE(business_id, user_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_business_users_business_id ON business_users(business_id);
CREATE INDEX idx_business_users_user_id ON business_users(user_id);
CREATE INDEX idx_business_users_role ON business_users(role);

-- Enable RLS
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view business_users records for businesses they belong to
CREATE POLICY "Users can view business_users for their businesses" ON business_users
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM business_users WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Business owners can manage team members
CREATE POLICY "Business owners can manage team members" ON business_users
    FOR ALL USING (
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- RLS Policy: Users can insert themselves as members (for business creation)
CREATE POLICY "Users can insert themselves as business members" ON business_users
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Function to automatically add business owner as a member when business is created
CREATE OR REPLACE FUNCTION add_business_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO business_users (business_id, user_id, role, permissions)
    VALUES (NEW.id, NEW.owner_id, 'owner', '{"all": true}');
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically add business owner as a member
CREATE TRIGGER add_business_owner_as_member_trigger
    AFTER INSERT ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION add_business_owner_as_member();

