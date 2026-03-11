/**
 * Waterfall Enrichment Orchestrator (BUS-82)
 * Tries multiple sources in priority order with intelligent merging
 */

const { enrichPersonWithApollo } = require('./apollo');
const { enrichPersonWithClearbit } = require('./clearbit');
const { enrichLeadWithAI } = require('../ai');

/**
 * Normalize lead data to handle both snake_case (from DB) and camelCase (from API) inputs
 */
function normalizeLead(lead) {
    return {
        id: lead.id,
        email: lead.email,
        linkedin_url: lead.linkedin_url || lead.linkedinUrl,
        first_name: lead.first_name || lead.firstName,
        last_name: lead.last_name || lead.lastName,
        company: lead.company,
        job_title: lead.job_title || lead.jobTitle
    };
}

/**
 * Enrich lead using waterfall strategy
 * Priority: Apollo → Clearbit → AI (our existing scraper + AI)
 */
async function waterfallEnrichment(leadInput, scrapedData = null) {
    // Normalize input to handle both snake_case and camelCase
    const lead = normalizeLead(leadInput);
    
    console.log(`💧 Starting waterfall enrichment for lead ID: ${lead.id || 'new'}`);

    let enrichedData = {};
    const sources = [];

    // Try Apollo first
    if (lead.linkedin_url || lead.email) {
        const apolloData = await enrichPersonWithApollo(lead.linkedin_url || lead.email);
        if (apolloData) {
            enrichedData = { ...enrichedData, ...apolloData };
            sources.push('apollo');
            console.log('✅ Apollo enrichment successful');
        }
    }

    // If we still have missing fields, try Clearbit
    if (lead.email && (!enrichedData.phone || !enrichedData.company)) {
        const clearbitData = await enrichPersonWithClearbit(lead.email);
        if (clearbitData) {
            // Only fill in missing fields (don't override Apollo data)
            enrichedData = mergeData(enrichedData, clearbitData);
            sources.push('clearbit');
            console.log('✅ Clearbit enrichment successful');
        }
    }

    // Fallback to AI if we still have missing critical fields
    if (!enrichedData.first_name || !enrichedData.job_title) {
        console.log('📊 Falling back to AI enrichment...');
        const aiData = await enrichLeadWithAI(scrapedData || {
            body_text: `${lead.first_name} ${lead.last_name} ${lead.job_title || ''} ${lead.company || ''}`,
            title: lead.linkedin_url || ''
        });

        enrichedData = mergeData(enrichedData, aiData);
        sources.push('ai');
    }

    return {
        ...enrichedData,
        enrichment_sources: sources.join(', '),
        is_enriched: true
    };
}

/**
 * Intelligent data merging
 * Prefers existing data over new data (first source wins)
 */
function mergeData(existing, newData) {
    const merged = { ...existing };

    Object.keys(newData).forEach(key => {
        // Only use new data if the field is empty/null
        if (!merged[key] || merged[key] === 'Unknown' || merged[key] === '') {
            merged[key] = newData[key];
        }
    });

    return merged;
}

// Export with both names for backwards compatibility
module.exports = { 
    waterfallEnrichment,
    enrichWithWaterfall: waterfallEnrichment 
};
