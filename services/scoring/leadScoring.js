/**
 * Lead Scoring Algorithm (BUS-87, BUS-88)
 * AI-powered scoring from 0-100 based on multiple factors
 */

/**
 * Calculate comprehensive lead score
 */
function calculateLeadScore(lead) {
    let score = 0;
    const breakdown = {};

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
function calculateCompletenessScore(lead) {
    const fields = {
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
        if (lead[field] && lead[field] !== 'Unknown' && lead[field] !== null) {
            score += fields[field];
        }
    });

    return score;
}

/**
 * Job title seniority scoring (25 points max)
 */
function calculateSeniorityScore(jobTitle) {
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
function calculateCompanyScore(lead) {
    let score = 0;

    // Has company name
    if (lead.company) score += 10;

    // Check if company is recognized (Fortune 500, well-known tech companies, etc.)
    if (lead.company) {
        const knownCompanies = [
            'google', 'microsoft', 'amazon', 'apple', 'meta', 'facebook',
            'netflix', 'tesla', 'uber', 'airbnb', 'stripe', 'salesforce',
            'oracle', 'ibm', 'intel', 'nvidia', 'adobe'
        ];

        const companyLower = lead.company.toLowerCase();
        if (knownCompanies.some(known => companyLower.includes(known))) {
            score += 15;
        }
    }

    return score;
}

/**
 * Engagement potential scoring (20 points max)
 */
function calculateEngagementScore(lead) {
    let score = 0;

    // Has LinkedIn profile
    if (lead.linkedin_url) score += 8;

    // Recently created (fresh lead is more valuable)
    if (lead.created_at) {
        const daysOld = (Date.now() - new Date(lead.created_at)) / (1000 * 60 * 60 * 24);
        if (daysOld < 7) score += 7;
        else if (daysOld < 30) score += 5;
        else if (daysOld < 90) score += 3;
    }

    // Has been enriched (more reliable data)
    if (lead.is_enriched) score += 5;

    return score;
}

/**
 * Convert score to tier
 */
function getScoreTier(score) {
    if (score >= 80) return 'A'; // Hot lead
    if (score >= 60) return 'B'; // Warm lead
    if (score >= 40) return 'C'; // Ok lead
    return 'D'; // Cold lead
}

module.exports = {
    calculateLeadScore,
    getScoreTier
};
