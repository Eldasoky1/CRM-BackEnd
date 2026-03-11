-- Run this in Supabase SQL Editor to see ALL data
-- (Bypasses RLS for admin viewing)

-- Show all leads
SELECT 
    id,
    first_name,
    last_name,
    email,
    company,
    job_title,
    lead_score,
    status,
    is_enriched
FROM leads
ORDER BY lead_score DESC;

-- Show all tags
SELECT * FROM tags;

-- Show all notes
SELECT * FROM notes;

-- Show all tag assignments
SELECT * FROM lead_tags;

-- Summary counts
SELECT 
    (SELECT COUNT(*) FROM leads) as total_leads,
    (SELECT COUNT(*) FROM tags) as total_tags,
    (SELECT COUNT(*) FROM notes) as total_notes,
    (SELECT COUNT(*) FROM lead_tags) as total_tag_assignments;
