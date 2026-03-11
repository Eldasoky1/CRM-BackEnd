/**
 * Background Job System for Auto-Enrichment (BUS-84)
 * Uses node-cron for scheduling and manages enrichment queue
 * Converted to TypeScript with proper type definitions
 */

import cron from 'node-cron';
import { SupabaseClient } from '@supabase/supabase-js';
import { Lead, LeadScoreResult } from '../../types';

interface EnrichmentJob {
    leadId: string;
    priority: 'normal' | 'high';
    retries: number;
    addedAt: Date;
    status: 'pending' | 'processing' | 'retrying' | 'failed';
}

interface QueueStatus {
    queueLength: number;
    isProcessing: boolean;
    pendingJobs: string[];
}

interface JobResult {
    success: boolean;
    skipped?: boolean;
    leadId?: string;
    score?: number;
    error?: string;
}

type EnrichWithWaterfallFn = (lead: {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
    linkedinUrl?: string | null;
}) => Promise<Record<string, unknown>>;

type CalculateLeadScoreFn = (lead: Lead) => number | LeadScoreResult;

// In-memory queue for enrichment jobs
const enrichmentQueue: EnrichmentJob[] = [];
let isProcessing = false;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

/**
 * Add a lead to the enrichment queue
 */
export function addToQueue(
    leadId: string,
    priority: 'normal' | 'high' = 'normal'
): EnrichmentJob {
    const job: EnrichmentJob = {
        leadId,
        priority,
        retries: 0,
        addedAt: new Date(),
        status: 'pending'
    };

    if (priority === 'high') {
        enrichmentQueue.unshift(job);
    } else {
        enrichmentQueue.push(job);
    }

    console.log(`📥 Added lead ${leadId} to enrichment queue (priority: ${priority})`);
    return job;
}

/**
 * Process a single enrichment job with retry logic
 */
async function processJob(
    job: EnrichmentJob,
    supabase: SupabaseClient,
    enrichWithWaterfall: EnrichWithWaterfallFn,
    calculateLeadScore: CalculateLeadScoreFn
): Promise<JobResult> {
    const { leadId } = job;

    try {
        console.log(`🔄 Processing enrichment for lead ${leadId} (attempt ${job.retries + 1})`);

        // Fetch lead data
        const { data: lead, error } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (error || !lead) {
            throw new Error(`Lead not found: ${leadId}`);
        }

        // Skip if already enriched
        if (lead.is_enriched) {
            console.log(`⏭️ Lead ${leadId} already enriched, skipping`);
            return { success: true, skipped: true };
        }

        // Perform waterfall enrichment
        const enrichedData = await enrichWithWaterfall({
            email: lead.email,
            firstName: lead.first_name,
            lastName: lead.last_name,
            company: lead.company,
            linkedinUrl: lead.linkedin_url
        });

        // Calculate new score
        const scoreResult = calculateLeadScore({ ...lead, ...enrichedData } as Lead);
        const newScore = typeof scoreResult === 'number'
            ? scoreResult
            : (scoreResult as LeadScoreResult).total_score;

        // Update lead in database
        const { error: updateError } = await supabase
            .from('leads')
            .update({
                ...enrichedData,
                lead_score: newScore,
                is_enriched: true,
                enriched_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', leadId);

        if (updateError) throw updateError;

        console.log(`✅ Successfully enriched lead ${leadId}`);
        return { success: true, leadId, score: newScore };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Enrichment failed for lead ${leadId}:`, errorMessage);

        // Retry logic with exponential backoff
        if (job.retries < MAX_RETRIES) {
            job.retries++;
            job.status = 'retrying';
            const delay = RETRY_DELAY_MS * Math.pow(2, job.retries - 1);

            console.log(`🔁 Retrying lead ${leadId} in ${delay}ms (attempt ${job.retries}/${MAX_RETRIES})`);

            setTimeout(() => {
                enrichmentQueue.push(job);
            }, delay);
        } else {
            job.status = 'failed';
            console.error(`💀 Lead ${leadId} enrichment permanently failed after ${MAX_RETRIES} retries`);

            // Mark as failed in database
            await supabase
                .from('leads')
                .update({
                    enrichment_status: 'failed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', leadId);
        }

        return { success: false, error: errorMessage };
    }
}

/**
 * Process the enrichment queue
 */
async function processQueue(
    supabase: SupabaseClient,
    enrichWithWaterfall: EnrichWithWaterfallFn,
    calculateLeadScore: CalculateLeadScoreFn
): Promise<void> {
    if (isProcessing || enrichmentQueue.length === 0) return;

    isProcessing = true;
    console.log(`📋 Processing enrichment queue (${enrichmentQueue.length} jobs)`);

    while (enrichmentQueue.length > 0) {
        const job = enrichmentQueue.shift()!;
        if (job.status !== 'retrying') {
            job.status = 'processing';
        }
        await processJob(job, supabase, enrichWithWaterfall, calculateLeadScore);

        // Small delay between jobs to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    isProcessing = false;
    console.log('✅ Queue processing complete');
}

/**
 * Auto-enrich new leads that haven't been enriched
 */
async function autoEnrichNewLeads(
    supabase: SupabaseClient,
    enrichWithWaterfall: EnrichWithWaterfallFn,
    calculateLeadScore: CalculateLeadScoreFn
): Promise<void> {
    console.log('🔍 Scanning for unenriched leads...');

    try {
        const { data: leads, error } = await supabase
            .from('leads')
            .select('id')
            .eq('is_enriched', false)
            .order('created_at', { ascending: true })
            .limit(10);

        if (error) throw error;

        if (leads && leads.length > 0) {
            console.log(`📥 Found ${leads.length} leads to enrich`);
            leads.forEach((lead: { id: string }) => addToQueue(lead.id));
            await processQueue(supabase, enrichWithWaterfall, calculateLeadScore);
        } else {
            console.log('✅ No unenriched leads found');
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('❌ Auto-enrich scan failed:', errorMessage);
    }
}

/**
 * Start the background job scheduler
 */
export function startScheduler(
    supabase: SupabaseClient,
    enrichWithWaterfall: EnrichWithWaterfallFn,
    calculateLeadScore: CalculateLeadScoreFn
): void {
    console.log('🚀 Starting enrichment job scheduler...');

    // Run every 5 minutes
    cron.schedule('*/5 * * * *', () => {
        console.log('⏰ Scheduled enrichment job triggered');
        autoEnrichNewLeads(supabase, enrichWithWaterfall, calculateLeadScore);
    });

    // Process queue every minute
    cron.schedule('* * * * *', () => {
        if (enrichmentQueue.length > 0) {
            processQueue(supabase, enrichWithWaterfall, calculateLeadScore);
        }
    });

    console.log('✅ Scheduler started - enrichment runs every 5 minutes');
}

/**
 * Get queue status
 */
export function getQueueStatus(): QueueStatus {
    return {
        queueLength: enrichmentQueue.length,
        isProcessing,
        pendingJobs: enrichmentQueue.map(job => job.leadId)
    };
}

/**
 * Clear the queue
 */
export function clearQueue(): number {
    const count = enrichmentQueue.length;
    enrichmentQueue.length = 0;
    console.log(`🗑️ Cleared ${count} jobs from queue`);
    return count;
}
