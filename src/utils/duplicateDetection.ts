/**
 * Duplicate Detection utilities for leads
 * Uses Levenshtein distance for fuzzy matching
 * Converted to TypeScript with proper type definitions
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Lead, DuplicateResult, DuplicatePair } from '../types';

/**
 * Find potential duplicate leads for a user
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
    const processedPairs = new Set<string>();

    for (let i = 0; i < leads.length; i++) {
        for (let j = i + 1; j < leads.length; j++) {
            const lead1 = leads[i] as Lead;
            const lead2 = leads[j] as Lead;

            // Create unique pair identifier
            const pairId = [lead1.id, lead2.id].sort().join('-');
            if (processedPairs.has(pairId)) continue;
            processedPairs.add(pairId);

            const score = calculateDuplicateScore(lead1, lead2);

            if (score >= 70) {
                duplicates.push({
                    lead1_id: lead1.id || '',
                    lead2_id: lead2.id || '',
                    score,
                    matchedFields: getMatchedFields(lead1, lead2),
                    recommendation: score >= 90 ? 'merge' : 'review'
                });
            }
        }
    }

    // Sort by score descending
    return duplicates.sort((a, b) => b.score - a.score);
}

/**
 * Calculate duplicate similarity score between two leads (0-100)
 */
export function calculateDuplicateScore(lead1: Lead, lead2: Lead): number {
    let totalWeight = 0;
    let matchScore = 0;

    // Email match (highest weight - 40 points)
    if (lead1.email && lead2.email) {
        totalWeight += 40;
        if (lead1.email.toLowerCase() === lead2.email.toLowerCase()) {
            matchScore += 40;
        }
    }

    // Name similarity (25 points)
    const name1 = `${lead1.first_name || ''} ${lead1.last_name || ''}`.trim().toLowerCase();
    const name2 = `${lead2.first_name || ''} ${lead2.last_name || ''}`.trim().toLowerCase();

    if (name1 && name2) {
        totalWeight += 25;
        const nameSimilarity = calculateStringSimilarity(name1, name2);
        matchScore += nameSimilarity * 25;
    }

    // Company match (20 points)
    if (lead1.company && lead2.company) {
        totalWeight += 20;
        const companySimilarity = calculateStringSimilarity(
            lead1.company.toLowerCase(),
            lead2.company.toLowerCase()
        );
        matchScore += companySimilarity * 20;
    }

    // Phone match (15 points)
    if (lead1.phone && lead2.phone) {
        totalWeight += 15;
        const phone1 = normalizePhone(lead1.phone);
        const phone2 = normalizePhone(lead2.phone);
        if (phone1 === phone2) {
            matchScore += 15;
        }
    }

    // LinkedIn URL match (exact match bonus)
    if (lead1.linkedin_url && lead2.linkedin_url) {
        if (normalizeLinkedInUrl(lead1.linkedin_url) === normalizeLinkedInUrl(lead2.linkedin_url)) {
            return 100; // Exact LinkedIn match is definite duplicate
        }
    }

    if (totalWeight === 0) return 0;
    return Math.round((matchScore / totalWeight) * 100);
}

/**
 * Calculate string similarity using Levenshtein distance
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    const distance = levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);

    return 1 - (distance / maxLength);
}

/**
 * Levenshtein distance implementation
 */
export function levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // Create distance matrix
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // Fill in the rest
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j],     // deletion
                    dp[i][j - 1],     // insertion
                    dp[i - 1][j - 1]  // substitution
                );
            }
        }
    }

    return dp[m][n];
}

/**
 * Normalize phone number for comparison
 */
function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '').slice(-10);
}

/**
 * Normalize LinkedIn URL for comparison
 */
function normalizeLinkedInUrl(url: string): string {
    return url.toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/www\./, '')
        .replace(/\/$/, '')
        .replace(/linkedin\.com\/in\//, '');
}

/**
 * Get list of fields that matched between two leads
 */
function getMatchedFields(lead1: Lead, lead2: Lead): string[] {
    const matched: string[] = [];

    if (lead1.email && lead2.email &&
        lead1.email.toLowerCase() === lead2.email.toLowerCase()) {
        matched.push('email');
    }

    if (lead1.first_name && lead2.first_name &&
        lead1.first_name.toLowerCase() === lead2.first_name.toLowerCase()) {
        matched.push('first_name');
    }

    if (lead1.last_name && lead2.last_name &&
        lead1.last_name.toLowerCase() === lead2.last_name.toLowerCase()) {
        matched.push('last_name');
    }

    if (lead1.company && lead2.company &&
        lead1.company.toLowerCase() === lead2.company.toLowerCase()) {
        matched.push('company');
    }

    if (lead1.phone && lead2.phone &&
        normalizePhone(lead1.phone) === normalizePhone(lead2.phone)) {
        matched.push('phone');
    }

    return matched;
}

/**
 * Merge duplicate leads (keeps lead1 as primary)
 */
export async function mergeDuplicates(
    supabase: SupabaseClient,
    primaryLeadId: string,
    duplicateLeadId: string
): Promise<Lead> {
    // Fetch both leads
    const [{ data: primary }, { data: duplicate }] = await Promise.all([
        supabase.from('leads').select('*').eq('id', primaryLeadId).single(),
        supabase.from('leads').select('*').eq('id', duplicateLeadId).single()
    ]);

    if (!primary || !duplicate) {
        throw new Error('One or both leads not found');
    }

    // Merge: fill in empty fields from duplicate
    const merged: Partial<Lead> = { ...primary };

    const fieldsToMerge: (keyof Lead)[] = [
        'email', 'phone', 'job_title', 'company', 'location',
        'linkedin_url', 'ai_summary'
    ];

    for (const field of fieldsToMerge) {
        if (!merged[field] && duplicate[field]) {
            (merged as Record<string, unknown>)[field] = duplicate[field];
        }
    }

    // Take highest lead score
    if (duplicate.lead_score > (primary.lead_score || 0)) {
        merged.lead_score = duplicate.lead_score;
    }

    // Update primary lead
    const { data: updated, error } = await supabase
        .from('leads')
        .update({
            ...merged,
            updated_at: new Date().toISOString()
        })
        .eq('id', primaryLeadId)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update lead: ${error.message}`);
    }

    // Delete duplicate
    await supabase.from('leads').delete().eq('id', duplicateLeadId);

    return updated as Lead;
}
