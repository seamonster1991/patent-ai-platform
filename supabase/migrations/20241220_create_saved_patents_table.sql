-- Create saved_patents table for user bookmarks
CREATE TABLE IF NOT EXISTS saved_patents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  patent_application_number TEXT NOT NULL,
  patent_title TEXT,
  applicant_name TEXT,
  application_date DATE,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  tags TEXT[],
  UNIQUE(user_id, patent_application_number)
);

-- Create indexes for saved_patents
CREATE INDEX IF NOT EXISTS idx_saved_patents_user_id ON saved_patents(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_patents_application_number ON saved_patents(patent_application_number);
CREATE INDEX IF NOT EXISTS idx_saved_patents_saved_at ON saved_patents(saved_at);

-- Enable RLS
ALTER TABLE saved_patents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own saved patents" ON saved_patents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved patents" ON saved_patents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved patents" ON saved_patents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved patents" ON saved_patents
  FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL PRIVILEGES ON saved_patents TO authenticated;
GRANT SELECT ON saved_patents TO anon;