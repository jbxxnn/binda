-- Create businesses table
CREATE TABLE businesses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'basic', 'premium')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'past_due')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX idx_businesses_slug ON businesses(slug);

-- Enable RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see businesses they own
CREATE POLICY "Users can view businesses they own" ON businesses
    FOR SELECT USING (owner_id = auth.uid());

-- RLS Policy: Users can only update businesses they own
CREATE POLICY "Users can update businesses they own" ON businesses
    FOR UPDATE USING (owner_id = auth.uid());

-- RLS Policy: Users can only insert businesses they own
CREATE POLICY "Users can insert businesses they own" ON businesses
    FOR INSERT WITH CHECK (owner_id = auth.uid());

-- RLS Policy: Users can only delete businesses they own
CREATE POLICY "Users can delete businesses they own" ON businesses
    FOR DELETE USING (owner_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
