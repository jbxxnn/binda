-- Update businesses RLS policy to include business_users after the table is created

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view businesses they own" ON businesses;

-- Create the updated policy that includes business_users
CREATE POLICY "Users can view businesses they own or are members of" ON businesses
    FOR SELECT USING (
        owner_id = auth.uid() OR 
        id IN (
            SELECT business_id FROM business_users WHERE user_id = auth.uid()
        )
    );

