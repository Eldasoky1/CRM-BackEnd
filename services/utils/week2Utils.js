/**
 * Lead Scoring & Duplicate Detection Utilities
 * Consolidated Week 2 services
 */

const { enrichLeadWithAI } = require('../ai');

/**
 * LEAD SCORING (BUS-87, BUS-88)
 */
function calculateLeadScore(lead) {
    let score = 0;

    // 1. Completeness (30 pts)
    if (lead.first_name) score += 3;
    if (lead.last_name) score += 3;
    if (lead.email) score += 8;
    if (lead.phone) score += 6;
    if (lead.job_title) score += 4;
    if (lead.company) score += 4;
    if (lead.location) score += 2;

    // 2. Seniority (25 pts)
    if (lead.job_title) {
        const title = lead.job_title.toLowerCase();
        if (/(ceo|cto|cfo|founder|president)/i.test(title)) score += 25;
        else if (/(vp|vice president|director|head of)/i.test(title)) score += 20;
        else if (/(manager|lead)/i.test(title)) score += 15;
        else if (/(senior|sr)/i.test(title)) score += 10;
        else score += 5;
    }

    // 3. Company (25 pts)
    if (lead.company) {
        score += 10;
        const knownCompanies = ['google', 'microsoft', 'amazon', 'apple', 'meta'];
        if (knownCompanies.some(c => lead.company.toLowerCase().includes(c))) score += 15;
    }

    // 4. Engagement (20 pts)
    if (lead.linkedin_url) score += 8;
    if (lead.is_enriched) score += 5;
    if (lead.created_at) {
        const daysOld = (Date.now() - new Date(lead.created_at)) / (1000 * 60 * 60 * 24);
        if (daysOld < 7) score += 7;
        else if (daysOld < 30) score += 5;
    }

    return Math.min(100, Math.round(score));
}

/**
 * DUPLICATE DETECTION (BUS-92)
 */
async function findDuplicates(supabase, userId) {
    const { data: leads } = await supabase.from('leads').select('*').eq('user_id', userId);
    if (!leads) return [];

    const duplicates = [];
    for (let i = 0; i < leads.length; i++) {
        for (let j = i + 1; j < leads.length; j++) {
            const score = calculateDuplicateScore(leads[i], leads[j]);
            if (score >= 70) {
                duplicates.push({
                    lead1: leads[i].id,
                    lead2: leads[j].id,
                    confidence: score,
                    reason: getDuplicateReason(leads[i], leads[j])
                });
            }
        }
    }
    return duplicates;
}

function calculateDuplicateScore(lead1, lead2) {
    if (lead1.email && lead2.email && lead1.email.toLowerCase() === lead2.email.toLowerCase()) return 100;
    if (lead1.phone && lead2.phone && normalizePhone(lead1.phone) === normalizePhone(lead2.phone)) return 90;
    if (lead1.linkedin_url && lead2.linkedin_url && lead1.linkedin_url === lead2.linkedin_url) return 95;

    const name1 = `${lead1.first_name} ${lead1.last_name}`.toLowerCase();
    const name2 = `${lead2.first_name} ${lead2.last_name}`.toLowerCase();
    if (name1 === name2 && lead1.company && lead2.company && lead1.company === lead2.company) return 85;

    return 0;
}

function getDuplicateReason(lead1, lead2) {
    if (lead1.email === lead2.email) return 'Same email';
    if (lead1.phone === lead2.phone) return 'Same phone';
    if (lead1.linkedin_url === lead2.linkedin_url) return 'Same LinkedIn';
    return 'Similar name and company';
}

function normalizePhone(phone) {
    return phone.replace(/[\s\-\(\)\+]/g, '');
}

/**
 * CSV EXPORT (BUS-94)
 */
function leadsToCSV(leads) {
    if (!leads || leads.length === 0) return 'No data';

    const cols = ['first_name', 'last_name', 'email', 'phone', 'job_title', 'company', 'lead_score', 'status'];
    const header = cols.join(',');
    const rows = leads.map(l => cols.map(c => l[c] || '').join(','));
    return [header, ...rows].join('\n');
}

module.exports = {
    calculateLeadScore,
    findDuplicates,
    leadsToCSV
};
