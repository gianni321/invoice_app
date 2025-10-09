-- Add tag field to entries table
-- This allows categorizing time entries as Dev Work, Bug Fix, Call, Meeting, etc.

ALTER TABLE entries ADD COLUMN tag TEXT;

-- Create an index on the tag column for better query performance
CREATE INDEX idx_entries_tag ON entries(tag);