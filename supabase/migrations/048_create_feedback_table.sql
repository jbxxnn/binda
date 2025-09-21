-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('bug', 'feature', 'improvement', 'general', 'ui', 'performance', 'other')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  subject VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'duplicate')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_business_id ON feedback(business_id);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own feedback" ON feedback
  FOR SELECT USING (
    user_id = auth.uid() OR
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own feedback" ON feedback
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own feedback" ON feedback
  FOR UPDATE USING (
    user_id = auth.uid() AND
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_feedback_updated_at
    BEFORE UPDATE ON feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_updated_at();

-- Create function to get feedback statistics
CREATE OR REPLACE FUNCTION get_feedback_stats(business_uuid UUID)
RETURNS TABLE (
  total_feedback BIGINT,
  open_feedback BIGINT,
  resolved_feedback BIGINT,
  avg_rating NUMERIC,
  category_counts JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_feedback,
    COUNT(*) FILTER (WHERE status = 'open') as open_feedback,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_feedback,
    ROUND(AVG(rating), 2) as avg_rating,
    jsonb_object_agg(
      category, 
      category_count
    ) as category_counts
  FROM (
    SELECT 
      category,
      COUNT(*) as category_count
    FROM feedback 
    WHERE business_id = business_uuid
    GROUP BY category
  ) category_stats
  CROSS JOIN (
    SELECT 
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE status = 'open') as open_count,
      COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
      AVG(rating) as avg_rating
    FROM feedback 
    WHERE business_id = business_uuid
  ) stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
