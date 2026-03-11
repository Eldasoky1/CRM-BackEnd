-- 1. PROFILES (Extends default Supabase Auth)
select * from leads;
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  company_name text,
  subscription_tier text default 'free', -- free, pro, enterprise
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure columns exist if the table was already there
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'company_name') then
        alter table public.profiles add column company_name text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'subscription_tier') then
        alter table public.profiles add column subscription_tier text default 'free';
    end if;
end $$;

-- 2. LEADS ( The core data entity)
create table if not exists public.leads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  -- Core Lead Info
  first_name text,
  last_name text,
  email text,
  phone text,
  job_title text,
  company text,
  location text,
  
  -- Scraping/Source Data
  linkedin_url text,
  source_platform text, -- 'linkedin', 'upwork', 'manual'
  
  -- Enrichment & AI Status
  is_enriched boolean default false,
  ai_summary text, -- The AI generated insights
  lead_score integer default 0, -- 0-100 score based on AI logic
  
  -- Metadata
  status text default 'new', -- new, contacted, interested, closed
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. SCRAPE_JOBS (To track async scraping tasks)
create table if not exists public.scrape_jobs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  target_url text not null,
  status text default 'pending', -- pending, processing, completed, failed
  error_log text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. ENABLE RLS (Row Level Security) - Critical for security
alter table profiles enable row level security;
alter table leads enable row level security;
alter table scrape_jobs enable row level security;

-- Simple Policy: Users can only see their own leads
drop policy if exists "Users can view their own leads" on leads;
create policy "Users can view their own leads" on leads
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own leads" on leads;
create policy "Users can insert their own leads" on leads
  for insert with check (auth.uid() = user_id);

-- 5. NOTES (For lead activity tracking)
create table if not exists public.notes (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references public.leads(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. TAGS (For lead categorization)
create table if not exists public.tags (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  color text default '#6366f1',
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. LEAD_TAGS (Junction table for many-to-many)
create table if not exists public.lead_tags (
  lead_id uuid references public.leads(id) on delete cascade not null,
  tag_id uuid references public.tags(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (lead_id, tag_id)
);

-- Enable RLS for new tables
alter table notes enable row level security;
alter table tags enable row level security;
alter table lead_tags enable row level security;

-- Policies for notes
drop policy if exists "Users can view their own notes" on notes;
create policy "Users can view their own notes" on notes
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own notes" on notes;
create policy "Users can insert their own notes" on notes
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own notes" on notes;
create policy "Users can update their own notes" on notes
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own notes" on notes;
create policy "Users can delete their own notes" on notes
  for delete using (auth.uid() = user_id);

-- Policies for tags
drop policy if exists "Users can view their own tags" on tags;
create policy "Users can view their own tags" on tags
  for select using (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can manage their tags" on tags;
create policy "Users can manage their tags" on tags
  for all using (auth.uid() = user_id);

-- ==============================================================================
-- DATA VIEWING QUERIES (Run these to see your data in Supabase SQL Editor)
-- These bypass RLS for admin viewing
-- ==============================================================================

-- View all leads with key information
SELECT 
    id,
    first_name,
    last_name,
    email,
    company,
    job_title,
    lead_score,
    status,
    is_enriched,
    created_at
FROM leads
ORDER BY lead_score DESC;

-- View all tags
SELECT * FROM tags ORDER BY created_at DESC;

-- View all notes
SELECT 
    n.id,
    n.content,
    n.created_at,
    l.first_name || ' ' || l.last_name as lead_name
FROM notes n
JOIN leads l ON l.id = n.lead_id
ORDER BY n.created_at DESC;

-- View tag assignments with lead names
SELECT 
    l.first_name || ' ' || l.last_name as lead_name,
    t.name as tag_name,
    t.color as tag_color
FROM lead_tags lt
JOIN leads l ON l.id = lt.lead_id
JOIN tags t ON t.id = lt.tag_id
ORDER BY l.first_name;

-- Summary statistics
SELECT 
    'Total Leads' as metric,
    COUNT(*)::text as value
FROM leads
UNION ALL
SELECT 
    'Total Tags',
    COUNT(*)::text
FROM tags
UNION ALL
SELECT 
    'Total Notes',
    COUNT(*)::text
FROM notes
UNION ALL
SELECT 
    'Total Tag Assignments',
    COUNT(*)::text
FROM lead_tags
UNION ALL
SELECT 
    'Average Lead Score',
    ROUND(AVG(lead_score))::text
FROM leads
UNION ALL
SELECT 
    'Enriched Leads',
    COUNT(*)::text
FROM leads
WHERE is_enriched = true;
