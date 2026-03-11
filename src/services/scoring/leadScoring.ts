/**
 * Lead Scoring Algorithm (BUS-87, BUS-88)
 * AI-powered scoring from 0-100 based on multiple factors
 * Converted to TypeScript with proper type definitions
 */

import { Lead, LeadScoreResult } from '../../types';

interface ScoreBreakdown {
    completeness: number;
    seniority: number;
    company: number;
    engagement: number;
}

/**
 * Calculate comprehensive lead score
 */
export function calculateLeadScore(lead: Lead): LeadScoreResult {
    let score = 0;
    const breakdown: ScoreBreakdown = {
        completeness: 0,
        seniority: 0,
        company: 0,
        engagement: 0
    };

    // 1. Profile Completeness (30 points)
    const completenessScore = calculateCompletenessScore(lead);
    score += completenessScore;
    breakdown.completeness = completenessScore;

    // 2. Seniority Level (25 points)
    const seniorityScore = calculateSeniorityScore(lead.job_title);
    score += seniorityScore;
    breakdown.seniority = seniorityScore;

    // 3. Company Quality (25 points)
    const companyScore = calculateCompanyScore(lead);
    score += companyScore;
    breakdown.company = companyScore;

    // 4. Engagement Potential (20 points)
    const engagementScore = calculateEngagementScore(lead);
    score += engagementScore;
    breakdown.engagement = engagementScore;

    return {
        total_score: Math.round(score),
        breakdown,
        tier: getScoreTier(score)
    };
}

/**
 * Profile completeness scoring (30 points max)
 */
function calculateCompletenessScore(lead: Lead): number {
    const fields: Record<string, number> = {
        first_name: 3,
        last_name: 3,
        email: 8,          // Email is critical
        phone: 6,
        job_title: 4,
        company: 4,
        location: 2
    };

    let score = 0;
    Object.keys(fields).forEach(field => {
        const value = lead[field as keyof Lead];
        if (value && value !== 'Unknown' && value !== null) {
            score += fields[field];
        }
    });

    return score;
}

/**
 * Job title seniority scoring (25 points max)
 */
function calculateSeniorityScore(jobTitle: string | null | undefined): number {
    if (!jobTitle) return 0;

    const title = jobTitle.toLowerCase();

    // C-Level & Executives (25 points)
    if (/(ceo|cto|cfo|coo|chief|president|founder|owner|partner)/i.test(title)) {
        return 25;
    }

    // VP & Directors (20 points)
    if (/(vp|vice president|director|head of)/i.test(title)) {
        return 20;
    }

    // Managers (15 points)
    if (/(manager|lead|principal)/i.test(title)) {
        return 15;
    }

    // Senior Individual Contributors (10 points)
    if (/(senior|sr\.|staff)/i.test(title)) {
        return 10;
    }

    // Mid-level (5 points)
    return 5;
}

/**
 * Company quality scoring (25 points max)
 */
function calculateCompanyScore(lead: Lead): number {
    let score = 0;

    // Has company name (10 points)
    if (lead.company && lead.company !== 'Unknown') {
        score += 10;
    }

    // Has industry information (5 points)
    if (lead.industry) {
        score += 5;
    }

    // Enrichment sources indicate verified company (10 points)
    if (lead.enrichment_sources?.includes('apollo') ||
        lead.enrichment_sources?.includes('clearbit')) {
        score += 10;
    }

    return Math.min(25, score);
}

/**
 * Engagement potential scoring (20 points max)
 */
function calculateEngagementScore(lead: Lead): number {
    let score = 0;

    // LinkedIn URL available (10 points)
    if (lead.linkedin_url) {
        score += 10;
    }

    // Has been enriched (5 points)
    if (lead.is_enriched) {
        score += 5;
    }

    // Has AI summary (5 points)
    if (lead.ai_summary) {
        score += 5;
    }

    return score;
}

/**
 * Determine score tier
 */
function getScoreTier(score: number): 'hot' | 'warm' | 'cold' {
    if (score >= 70) return 'hot';
    if (score >= 40) return 'warm';
    return 'cold';
}

/**
 * Batch score multiple leads
 */
export function batchScoreLeads(leads: Lead[]): Array<{ leadId: string; score: LeadScoreResult }> {
    return leads.map(lead => ({
        leadId: lead.id || '',
        score: calculateLeadScore(lead)
    }));
}

/**
 * Get scoring criteria explanation
 */
export function getScoringCriteria(): Record<string, { maxPoints: number; description: string }> {
    return {
        completeness: {
            maxPoints: 30,
            description: 'Profile completeness based on available contact information'
        },
        seniority: {
            maxPoints: 25,
            description: 'Job title seniority and decision-making authority'
        },
        company: {
            maxPoints: 25,
            description: 'Company information quality and verification status'
        },
        engagement: {
            maxPoints: 20,
            description: 'Engagement potential based on available channels'
        }
    };
}
