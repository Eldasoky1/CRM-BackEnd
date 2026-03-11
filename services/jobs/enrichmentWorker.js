/**
 * Background Job System for Auto-Enrichment (BUS-84)
 * Uses node-cron for scheduling and manages enrichment queue
 */

const cron = require('node-cron');

// In-memory queue for enrichment jobs
const enrichmentQueue = [];
let isProcessing = false;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

/**
 * Add a lead to the enrichment queue
 */
function addToQueue(leadId, priority = 'normal') {
    const job = {
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
async function processJob(job, supabase, enrichWithWaterfall, calculateLeadScore) {
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
        const newScore = calculateLeadScore({ ...lead, ...enrichedData });
        
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
        console.error(`❌ Enrichment failed for lead ${leadId}:`, error.message);
        
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
                .update({ enrichment_status: 'failed', updated_at: new Date().toISOString() })
                .eq('id', leadId);
        }
        
        return { success: false, error: error.message };
    }
}

/**
 * Process the enrichment queue
 */
async function processQueue(supabase, enrichWithWaterfall, calculateLeadScore) {
    if (isProcessing || enrichmentQueue.length === 0) return;
    
    isProcessing = true;
    console.log(`📋 Processing enrichment queue (${enrichmentQueue.length} jobs)`);
    
    while (enrichmentQueue.length > 0) {
        const job = enrichmentQueue.shift();
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
async function autoEnrichNewLeads(supabase, enrichWithWaterfall, calculateLeadScore) {
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
            leads.forEach(lead => addToQueue(lead.id));
            await processQueue(supabase, enrichWithWaterfall, calculateLeadScore);
        } else {
            console.log('✅ No unenriched leads found');
        }
    } catch (error) {
        console.error('❌ Auto-enrich scan failed:', error.message);
    }
}

/**
 * Start the background job scheduler
 */
function startScheduler(supabase, enrichWithWaterfall, calculateLeadScore) {
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
function getQueueStatus() {
    return {
        queueLength: enrichmentQueue.length,
        isProcessing,
        jobs: enrichmentQueue.map(j => ({
            leadId: j.leadId,
            status: j.status,
            retries: j.retries,
            addedAt: j.addedAt
        }))
    };
}

module.exports = {
    addToQueue,
    processQueue,
    autoEnrichNewLeads,
    startScheduler,
    getQueueStatus
};
