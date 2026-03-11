-- ============================================
-- PERFORMANCE OPTIMIZATION INDEXES (BUS-107)
-- Run these after initial schema creation
-- ============================================

-- Index on leads for common queries
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_is_enriched ON public.leads(is_enriched);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON public.leads(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source_platform ON public.leads(source_platform);

-- Composite indexes for filtered queries
CREATE INDEX IF NOT EXISTS idx_leads_user_status ON public.leads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_user_enriched ON public.leads(user_id, is_enriched);
CREATE INDEX IF NOT EXISTS idx_leads_user_score ON public.leads(user_id, lead_score DESC);

-- Full-text search index for lead search
CREATE INDEX IF NOT EXISTS idx_leads_search ON public.leads 
    USING gin(to_tsvector('english', 
        COALESCE(first_name, '') || ' ' || 
        COALESCE(last_name, '') || ' ' || 
        COALESCE(email, '') || ' ' || 
        COALESCE(company, '')
    ));

-- Index on notes for lead lookup
CREATE INDEX IF NOT EXISTS idx_notes_lead_id ON public.notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at DESC);

-- Index on tags
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON public.tags(name);

-- Index on lead_tags junction table
CREATE INDEX IF NOT EXISTS idx_lead_tags_lead_id ON public.lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_tag_id ON public.lead_tags(tag_id);

-- Index on scrape_jobs
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_user_id ON public.scrape_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON public.scrape_jobs(status);

-- ============================================
-- QUERY OPTIMIZATION VIEWS
-- ============================================

-- Materialized view for lead statistics (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_lead_stats AS
SELECT 
    user_id,
    COUNT(*) as total_leads,
    COUNT(*) FILTER (WHERE is_enriched = true) as enriched_leads,
    COUNT(*) FILTER (WHERE status = 'new') as new_leads,
    COUNT(*) FILTER (WHERE status = 'contacted') as contacted_leads,
    COUNT(*) FILTER (WHERE status = 'interested') as interested_leads,
    COUNT(*) FILTER (WHERE status = 'closed') as closed_leads,
    ROUND(AVG(lead_score)) as avg_score,
    MAX(created_at) as last_lead_created
FROM leads
GROUP BY user_id;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_lead_stats_user ON mv_lead_stats(user_id);

-- Function to refresh stats (call periodically)
CREATE OR REPLACE FUNCTION refresh_lead_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_lead_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- OPTIMIZED QUERIES
-- ============================================

-- Optimized lead search using full-text search
-- Usage: SELECT * FROM search_leads('john doe', 'user-uuid-here');
CREATE OR REPLACE FUNCTION search_leads(search_query text, uid uuid)
RETURNS SETOF leads AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM leads
    WHERE user_id = uid
    AND to_tsvector('english', 
        COALESCE(first_name, '') || ' ' || 
        COALESCE(last_name, '') || ' ' || 
        COALESCE(email, '') || ' ' || 
        COALESCE(company, '')
    ) @@ plainto_tsquery('english', search_query)
    ORDER BY lead_score DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Get leads with pagination (cursor-based for performance)
CREATE OR REPLACE FUNCTION get_leads_paginated(
    uid uuid,
    page_size int DEFAULT 20,
    cursor_id uuid DEFAULT NULL
)
RETURNS SETOF leads AS $$
BEGIN
    IF cursor_id IS NULL THEN
        RETURN QUERY
        SELECT *
        FROM leads
        WHERE user_id = uid
        ORDER BY created_at DESC, id
        LIMIT page_size;
    ELSE
        RETURN QUERY
        SELECT *
        FROM leads
        WHERE user_id = uid
        AND (created_at, id) < (
            SELECT created_at, id FROM leads WHERE id = cursor_id
        )
        ORDER BY created_at DESC, id
        LIMIT page_size;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DATABASE MAINTENANCE
-- ============================================

-- Analyze tables for query planner (run periodically)
ANALYZE leads;
ANALYZE notes;
ANALYZE tags;
ANALYZE lead_tags;
ANALYZE scrape_jobs;

-- Vacuum to reclaim space (run during low traffic)
-- VACUUM ANALYZE leads;
