/**
 * Batch Enrichment for Imports (BUS-100)
 * Process multiple leads efficiently with rate limiting
 */

const { enrichWithWaterfall } = require('./waterfall');
const { calculateLeadScore } = require('../scoring/leadScoring');

// Batch processing configuration
const BATCH_SIZE = 5;
const DELAY_BETWEEN_BATCHES_MS = 2000;
const DELAY_BETWEEN_ITEMS_MS = 500;

/**
 * Process leads in batches to avoid rate limiting
 */
async function processBatch(leads, supabase, onProgress) {
    const results = {
        successful: [],
        failed: [],
        skipped: []
    };

    for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        
        try {
            // Skip if already enriched
            if (lead.is_enriched) {
                results.skipped.push({ id: lead.id, reason: 'Already enriched' });
                continue;
            }

            console.log(`🔄 Batch enriching lead ${i + 1}/${leads.length}: ${lead.first_name} ${lead.last_name}`);

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
            const { error } = await supabase
                .from('leads')
                .update({
                    ...enrichedData,
                    lead_score: newScore,
                    is_enriched: true,
                    enriched_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', lead.id);

            if (error) throw error;

            results.successful.push({
                id: lead.id,
                name: `${lead.first_name} ${lead.last_name}`,
                score: newScore
            });

            // Report progress
            if (onProgress) {
                onProgress({
                    current: i + 1,
                    total: leads.length,
                    lead: lead.id,
                    status: 'success'
                });
            }

        } catch (error) {
            console.error(`❌ Failed to enrich lead ${lead.id}:`, error.message);
            results.failed.push({
                id: lead.id,
                name: `${lead.first_name} ${lead.last_name}`,
                error: error.message
            });

            if (onProgress) {
                onProgress({
                    current: i + 1,
                    total: leads.length,
                    lead: lead.id,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        // Delay between items to avoid rate limiting
        if (i < leads.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_ITEMS_MS));
        }
    }

    return results;
}

/**
 * Batch enrich leads by user ID
 */
async function batchEnrichByUser(supabase, userId, options = {}) {
    const { limit = 50, onlyUnenriched = true, onProgress } = options;

    console.log(`📦 Starting batch enrichment for user ${userId}`);

    // Fetch leads to enrich
    let query = supabase
        .from('leads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(limit);

    if (onlyUnenriched) {
        query = query.eq('is_enriched', false);
    }

    const { data: leads, error } = await query;

    if (error) {
        throw new Error(`Failed to fetch leads: ${error.message}`);
    }

    if (!leads || leads.length === 0) {
        return {
            message: 'No leads to enrich',
            successful: [],
            failed: [],
            skipped: []
        };
    }

    console.log(`📥 Found ${leads.length} leads to enrich`);

    // Process in batches
    const allResults = {
        successful: [],
        failed: [],
        skipped: []
    };

    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
        const batch = leads.slice(i, i + BATCH_SIZE);
        console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(leads.length / BATCH_SIZE)}`);

        const batchResults = await processBatch(batch, supabase, onProgress);

        allResults.successful.push(...batchResults.successful);
        allResults.failed.push(...batchResults.failed);
        allResults.skipped.push(...batchResults.skipped);

        // Delay between batches
        if (i + BATCH_SIZE < leads.length) {
            console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES_MS}ms before next batch...`);
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
        }
    }

    console.log(`\n✅ Batch enrichment complete!`);
    console.log(`   Successful: ${allResults.successful.length}`);
    console.log(`   Failed: ${allResults.failed.length}`);
    console.log(`   Skipped: ${allResults.skipped.length}`);

    return {
        message: 'Batch enrichment complete',
        total: leads.length,
        ...allResults
    };
}

/**
 * Batch enrich specific lead IDs
 */
async function batchEnrichByIds(supabase, leadIds, onProgress) {
    console.log(`📦 Starting batch enrichment for ${leadIds.length} leads`);

    const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .in('id', leadIds);

    if (error) {
        throw new Error(`Failed to fetch leads: ${error.message}`);
    }

    return processBatch(leads, supabase, onProgress);
}

/**
 * Get batch enrichment status
 */
function getBatchStats(results) {
    const total = results.successful.length + results.failed.length + results.skipped.length;
    return {
        total,
        successful: results.successful.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
        successRate: total > 0 ? ((results.successful.length / total) * 100).toFixed(1) + '%' : '0%'
    };
}

module.exports = {
    batchEnrichByUser,
    batchEnrichByIds,
    processBatch,
    getBatchStats,
    BATCH_SIZE,
    DELAY_BETWEEN_BATCHES_MS
};
