/**
 * Duplicate Detection Algorithm (BUS-92)
 * Finds potential duplicate leads using multiple matching strategies
 */

/**
 * Find duplicate leads in the database
 */
async function findDuplicates(supabase, userId, newLead = null) {
    console.log(`🔍 Searching for duplicates...`);

    const duplicates = [];

    // Get all leads for this user
    const { data: existingLeads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', userId);

    if (error || !existingLeads) return [];

    existingLeads.forEach(existing => {
        // Skip if comparing to itself
        if (newLead && existing.id === newLead.id) return;

        const compareTarget = newLead || existing;
        const score = calculateDuplicateScore(compareTarget, existing);

        if (score.confidence >= 70) {
            duplicates.push({
                lead_id: existing.id,
                duplicate_of: compareTarget.id,
                confidence: score.confidence,
                reasons: score.reasons,
                lead_data: {
                    name: `${existing.first_name} ${existing.last_name}`,
                    email: existing.email,
                    company: existing.company
                }
            });
        }
    });

    return duplicates;
}

/**
 * Calculate duplicate confidence score
 */
function calculateDuplicateScore(lead1, lead2) {
    const reasons = [];
    let totalScore = 0;

    // 1. Email exact match (100% confidence)
    if (lead1.email && lead2.email && lead1.email.toLowerCase() === lead2.email.toLowerCase()) {
        totalScore = 100;
        reasons.push('Exact email match');
        return { confidence: totalScore, reasons };
    }

    // 2. Phone exact match (90% confidence)
    if (lead1.phone && lead2.phone) {
        const phone1 = normalizePhone(lead1.phone);
        const phone2 = normalizePhone(lead2.phone);
        if (phone1 === phone2) {
            totalScore = 90;
            reasons.push('Exact phone match');
            return { confidence: totalScore, reasons };
        }
    }

    // 3. LinkedIn URL match (95% confidence)
    if (lead1.linkedin_url && lead2.linkedin_url) {
        const url1 = lead1.linkedin_url.toLowerCase().replace(/\/$/, '');
        const url2 = lead2.linkedin_url.toLowerCase().replace(/\/$/, '');
        if (url1 === url2) {
            totalScore = 95;
            reasons.push('LinkedIn URL match');
            return { confidence: totalScore, reasons };
        }
    }

    // 4. Name + Company fuzzy match
    const nameSimilarity = calculateNameSimilarity(lead1, lead2);
    const companySimilarity = calculateStringSimilarity(
        lead1.company || '',
        lead2.company || ''
    );

    if (nameSimilarity > 0.8 && companySimilarity > 0.8) {
        totalScore = 85;
        reasons.push('Very similar name and company');
    } else if (nameSimilarity > 0.9) {
        totalScore = 70;
        reasons.push('Very similar name');
    }

    return { confidence: totalScore, reasons };
}

/**
 * Calculate name similarity
 */
function calculateNameSimilarity(lead1, lead2) {
    const name1 = `${lead1.first_name || ''} ${lead1.last_name || ''}`.toLowerCase().trim();
    const name2 = `${lead2.first_name || ''} ${lead2.last_name || ''}`.toLowerCase().trim();

    if (!name1 || !name2) return 0;

    return calculateStringSimilarity(name1, name2);
}

/**
 * Levenshtein distance for string similarity
 */
function calculateStringSimilarity(str1, str2) {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    const distance = levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);

    return 1 - (distance / maxLength);
}

/**
 * Levenshtein distance algorithm
 */
function levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

/**
 * Normalize phone number for comparison
 */
function normalizePhone(phone) {
    return phone.replace(/[\s\-\(\)\+]/g, '');
}

module.exports = {
    findDuplicates,
    calculateDuplicateScore
};
