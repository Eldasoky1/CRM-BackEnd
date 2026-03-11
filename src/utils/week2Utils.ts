/**
 * Week 2 Utility Functions
 * Consolidated utilities for lead scoring, duplicate detection, and CSV export
 * Converted to TypeScript with proper type definitions
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Lead, LeadScoreResult, DuplicateResult } from '../types';

/**
 * Calculate lead score based on profile completeness and data quality
 */
export function calculateLeadScore(lead: Lead): number {
    let score = 0;

    // Profile completeness (50 points)
    if (lead.first_name && lead.first_name !== 'Unknown') score += 5;
    if (lead.last_name && lead.last_name !== 'Unknown') score += 5;
    if (lead.email) score += 15;
    if (lead.phone) score += 10;
    if (lead.job_title) score += 8;
    if (lead.company) score += 7;

    // Enrichment bonus (20 points)
    if (lead.is_enriched) score += 10;
    if (lead.ai_summary) score += 10;

    // Seniority scoring (20 points)
    if (lead.job_title) {
        const title = lead.job_title.toLowerCase();
        if (/(ceo|cto|cfo|coo|chief|founder|president|owner)/i.test(title)) {
            score += 20;
        } else if (/(vp|vice president|director|head)/i.test(title)) {
            score += 15;
        } else if (/(manager|lead|senior)/i.test(title)) {
            score += 10;
        } else {
            score += 5;
        }
    }

    // Contact quality (10 points)
    if (lead.linkedin_url) score += 5;
    if (lead.location) score += 5;

    // Cap at 100
    return Math.min(100, score);
}

/**
 * Calculate detailed lead score with breakdown
 */
export function calculateDetailedLeadScore(lead: Lead): LeadScoreResult {
    const breakdown = {
        completeness: 0,
        seniority: 0,
        engagement: 0,
        enrichment: 0
    };

    // Completeness (35 points)
    if (lead.first_name && lead.first_name !== 'Unknown') breakdown.completeness += 5;
    if (lead.last_name && lead.last_name !== 'Unknown') breakdown.completeness += 5;
    if (lead.email) breakdown.completeness += 10;
    if (lead.phone) breakdown.completeness += 8;
    if (lead.company) breakdown.completeness += 7;

    // Seniority (25 points)
    if (lead.job_title) {
        const title = lead.job_title.toLowerCase();
        if (/(ceo|cto|cfo|coo|chief|founder|president)/i.test(title)) {
            breakdown.seniority = 25;
        } else if (/(vp|vice president|director)/i.test(title)) {
            breakdown.seniority = 20;
        } else if (/(manager|head of)/i.test(title)) {
            breakdown.seniority = 15;
        } else if (/(senior|lead|principal)/i.test(title)) {
            breakdown.seniority = 10;
        } else {
            breakdown.seniority = 5;
        }
    }

    // Engagement potential (20 points)
    if (lead.linkedin_url) breakdown.engagement += 10;
    if (lead.location) breakdown.engagement += 5;
    if (lead.source_platform === 'linkedin') breakdown.engagement += 5;

    // Enrichment (20 points)
    if (lead.is_enriched) breakdown.enrichment += 10;
    if (lead.ai_summary) breakdown.enrichment += 10;

    const total_score = Math.min(100,
        breakdown.completeness +
        breakdown.seniority +
        breakdown.engagement +
        breakdown.enrichment
    );

    let tier: 'hot' | 'warm' | 'cold';
    if (total_score >= 70) {
        tier = 'hot';
    } else if (total_score >= 40) {
        tier = 'warm';
    } else {
        tier = 'cold';
    }

    return {
        total_score,
        breakdown,
        tier
    };
}

/**
 * Find duplicate leads using simple matching
 */
export async function findDuplicates(
    supabase: SupabaseClient,
    userId: string
): Promise<DuplicateResult[]> {
    const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        throw new Error(`Failed to fetch leads: ${error.message}`);
    }

    if (!leads || leads.length < 2) {
        return [];
    }

    const duplicates: DuplicateResult[] = [];

    for (let i = 0; i < leads.length; i++) {
        for (let j = i + 1; j < leads.length; j++) {
            const lead1 = leads[i] as Lead;
            const lead2 = leads[j] as Lead;

            // Check for email match
            if (lead1.email && lead2.email &&
                lead1.email.toLowerCase() === lead2.email.toLowerCase()) {
                duplicates.push({
                    lead1_id: lead1.id || '',
                    lead2_id: lead2.id || '',
                    score: 100,
                    matchedFields: ['email'],
                    recommendation: 'merge'
                });
                continue;
            }

            // Check for name + company match
            const name1 = `${lead1.first_name} ${lead1.last_name}`.toLowerCase();
            const name2 = `${lead2.first_name} ${lead2.last_name}`.toLowerCase();

            if (name1 === name2 && lead1.company && lead2.company &&
                lead1.company.toLowerCase() === lead2.company.toLowerCase()) {
                duplicates.push({
                    lead1_id: lead1.id || '',
                    lead2_id: lead2.id || '',
                    score: 85,
                    matchedFields: ['name', 'company'],
                    recommendation: 'review'
                });
            }
        }
    }

    return duplicates;
}

/**
 * Convert leads to CSV format
 */
export function leadsToCSV(leads: Lead[]): string {
    if (!leads || leads.length === 0) {
        return '';
    }

    const headers = [
        'id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'job_title',
        'company',
        'location',
        'linkedin_url',
        'lead_score',
        'status',
        'source_platform',
        'is_enriched',
        'ai_summary',
        'created_at'
    ];

    const escapeCSV = (value: unknown): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const rows = leads.map(lead => {
        return headers.map(header => {
            return escapeCSV(lead[header as keyof Lead]);
        }).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}
