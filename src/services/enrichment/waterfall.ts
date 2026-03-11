/**
 * Waterfall Enrichment Orchestrator (BUS-82)
 * Tries multiple sources in priority order with intelligent merging
 * Converted to TypeScript with proper type definitions
 */

import { enrichPersonWithApollo } from './apollo';
import { enrichPersonWithClearbit } from './clearbit';
import { enrichLeadWithAI } from '../ai';
import { Lead, ScrapedData } from '../../types';

interface NormalizedLead {
    id?: string;
    email?: string | null;
    linkedin_url?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    company?: string | null;
    job_title?: string | null;
}

interface EnrichedData {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    job_title?: string | null;
    company?: string | null;
    location?: string | null;
    linkedin_url?: string | null;
    ai_summary?: string;
    lead_score?: number;
    enrichment_sources?: string;
    is_enriched?: boolean;
    source?: string;
}

interface LeadInput {
    id?: string;
    email?: string | null;
    linkedin_url?: string | null;
    linkedinUrl?: string | null;
    first_name?: string | null;
    firstName?: string | null;
    last_name?: string | null;
    lastName?: string | null;
    company?: string | null;
    job_title?: string | null;
    jobTitle?: string | null;
}

/**
 * Normalize lead data to handle both snake_case (from DB) and camelCase (from API) inputs
 */
function normalizeLead(lead: LeadInput): NormalizedLead {
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
export async function waterfallEnrichment(
    leadInput: LeadInput,
    scrapedData: ScrapedData | null = null
): Promise<EnrichedData> {
    // Normalize input to handle both snake_case and camelCase
    const lead = normalizeLead(leadInput);

    console.log(`💧 Starting waterfall enrichment for lead ID: ${lead.id || 'new'}`);

    let enrichedData: EnrichedData = {};
    const sources: string[] = [];

    // Try Apollo first
    if (lead.linkedin_url || lead.email) {
        const apolloData = await enrichPersonWithApollo(lead.linkedin_url || lead.email || '');
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
            body_text: `${lead.first_name || ''} ${lead.last_name || ''} ${lead.job_title || ''} ${lead.company || ''}`,
            title: lead.linkedin_url || ''
        });

        enrichedData = mergeData(enrichedData, aiData as EnrichedData);
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
function mergeData(existing: EnrichedData, newData: EnrichedData): EnrichedData {
    const merged = { ...existing };

    Object.keys(newData).forEach(key => {
        const typedKey = key as keyof EnrichedData;
        // Only use new data if the field is empty/null
        if (!merged[typedKey] || merged[typedKey] === 'Unknown' || merged[typedKey] === '') {
            (merged as Record<string, unknown>)[typedKey] = newData[typedKey];
        }
    });

    return merged;
}

// Export with both names for backwards compatibility
export { waterfallEnrichment as enrichWithWaterfall };
