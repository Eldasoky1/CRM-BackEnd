// Type definitions for LeadCatch CRM

export interface Lead {
  id?: string;
  user_id?: string;
  scrape_job_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  job_title?: string | null;
  linkedin_url?: string | null;
  location?: string | null;
  ai_summary?: string | null;
  lead_score?: number | null;
  tags?: string[] | null;
  enrichment_source?: string | null;
  enrichment_sources?: string[] | null;
  status?: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  is_enriched?: boolean;
  industry?: string | null;
  source_platform?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown; // Index signature for dynamic access
}

export interface ScrapeJob {
  id?: string;
  user_id: string;
  target_url: string;
  platform?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ScrapedData {
  title?: string;
  meta_description?: string;
  body_text?: string;
  h1?: string;
  linkedin_url?: string;
  profile_data?: ProfileData;
}

export interface ProfileData {
  name?: string;
  headline?: string;
  location?: string;
  about?: string;
  experience?: ExperienceItem[];
  education?: EducationItem[];
  skills?: string[];
}

export interface ExperienceItem {
  title?: string;
  company?: string;
  duration?: string;
  description?: string;
}

export interface EducationItem {
  school?: string;
  degree?: string;
  field?: string;
  years?: string;
}

export interface EnrichmentData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  location?: string;
  linkedin_url?: string;
  ai_summary?: string;
  lead_score?: number;
  tags?: string[];
  enrichment_source?: string;
}

export interface ApolloEnrichmentResult {
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  linkedin_url?: string;
}

export interface ClearbitEnrichmentResult {
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  location?: string;
}

export interface EmailFinderResult {
  email?: string;
  confidence?: number;
  source?: string;
  verified?: boolean;
}

export interface LeadScoreResult {
  total_score: number;
  breakdown: {
    completeness?: number;
    seniority?: number;
    engagement?: number;
    enrichment?: number;
    profileCompleteness?: number;
    engagementPotential?: number;
    contactAvailability?: number;
  };
  tier?: 'hot' | 'warm' | 'cold';
  factors?: string[];
}

export interface DuplicateResult {
  lead1_id: string;
  lead2_id: string;
  score: number;
  matchedFields: string[];
  recommendation: 'merge' | 'review';
}

export interface DuplicatePair {
  id1: string;
  id2: string;
  similarity: number;
}

// Enriched Data type with index signature
export interface EnrichedData {
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  job_title?: string | null;
  title?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  ai_summary?: string | null;
  lead_score?: number | null;
  tags?: string[] | null;
  source?: string;
  sources?: string[];
  [key: string]: unknown; // Index signature for dynamic access
}

// Lead Input type for enrichment
export interface LeadInput {
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  email?: string | null;
  linkedin_url?: string | null;
  [key: string]: unknown;
}

// Type for waterfall enrichment function
export type EnrichWithWaterfallFn = (leadInput: LeadInput, scrapedData?: ScrapedData | null) => Promise<EnrichedData>;

// Cleaned fields type for AI
export interface CleanedFields {
  [key: string]: unknown;
}

export interface ExportMetadata {
  exportDate?: string;
  userId?: string;
  filters?: string;
}

export interface APIErrorResponse {
  error: string;
  stack?: string;
  code?: string;
}

export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface QueueJob {
  id: string;
  lead_id: string;
  attempt: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  created_at: string;
}

export interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Express Request Extensions
import { Request as ExpressRequest } from 'express';

export interface TypedRequest<T = unknown> extends ExpressRequest {
  body: T;
}

export interface ScrapeRequest {
  userId: string;
  targetUrl: string;
  platform?: string;
}

export interface LeadUpdateRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  status?: string;
  tags?: string[];
}

export interface BatchEnrichRequest {
  userId?: string;
  leadIds?: string[];
}

export interface WebhookRequest {
  url: string;
  events: string[];
  secret?: string;
}

// AI Service Types
export interface AIEnrichmentResult {
  first_name?: string | null;
  last_name?: string | null;
  job_title?: string | null;
  company?: string | null;
  location?: string | null;
  email?: string | null;
  ai_summary?: string;
  lead_score?: number;
  [key: string]: unknown; // Index signature for dynamic access
}

export interface AITagsResult {
  tags: string[];
  confidence: number;
}

// Logger Types
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogMeta {
  [key: string]: unknown;
}
