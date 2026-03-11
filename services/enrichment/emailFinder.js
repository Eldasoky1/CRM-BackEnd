/**
 * Email Finder Algorithms (BUS-85)
 * Finds/guesses professional emails using common patterns
 */

/**
 * Generate possible email patterns based on name and company
 */
function generateEmailPatterns(firstName, lastName, domain) {
    if (!firstName || !lastName || !domain) return [];

    const fn = firstName.toLowerCase().replace(/\s+/g, '');
    const ln = lastName.toLowerCase().replace(/\s+/g, '');
    const d = domain.toLowerCase().replace(/^www\./, '');

    return [
        `${fn}.${ln}@${d}`,              // john.doe@company.com
        `${fn}${ln}@${d}`,                // johndoe@company.com
        `${fn}@${d}`,                     // john@company.com
        `${fn[0]}${ln}@${d}`,             // jdoe@company.com
        `${fn}_${ln}@${d}`,               // john_doe@company.com
        `${fn}${ln[0]}@${d}`,             // johnd@company.com
        `${ln}.${fn}@${d}`,               // doe.john@company.com
        `${ln}@${d}`,                     // doe@company.com
    ];
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Find email for a lead (using Hunter.io if API key available)
 */
async function findEmail(firstName, lastName, domain) {
    console.log(`📧 Finding email for: ${firstName} ${lastName} @ ${domain}`);

    // Try Hunter.io if configured
    if (process.env.HUNTER_API_KEY && domain) {
        try {
            const hunterEmail = await findEmailWithHunter(firstName, lastName, domain);
            if (hunterEmail) {
                console.log(`✅ Found via Hunter: ${hunterEmail}`);
                return {
                    email: hunterEmail,
                    confidence: 'high',
                    source: 'hunter'
                };
            }
        } catch (error) {
            console.error('Hunter.io error:', error.message);
        }
    }

    // Fallback to pattern generation
    const patterns = generateEmailPatterns(firstName, lastName, domain);
    if (patterns.length > 0) {
        console.log(`💡 Generated ${patterns.length} possible email patterns`);
        return {
            email: patterns[0], // Return most common pattern
            confidence: 'medium',
            source: 'pattern',
            alternatives: patterns.slice(1, 4) // Return top 3 alternatives
        };
    }

    return null;
}

/**
 * Find email using Hunter.io API
 */
async function findEmailWithHunter(firstName, lastName, domain) {
    const url = `https://api.hunter.io/v2/email-finder?domain=${domain}&first_name=${firstName}&last_name=${lastName}&api_key=${process.env.HUNTER_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.data && data.data.email) {
        return data.data.email;
    }

    return null;
}

/**
 * Extract domain from company name or website
 */
function getDomainFromCompany(company) {
    if (!company) return null;

    // If it looks like a URL, extract domain
    if (company.includes('http://') || company.includes('https://')) {
        try {
            const url = new URL(company);
            return url.hostname.replace(/^www\./, '');
        } catch {
            return null;
        }
    }

    // Simple heuristic: convert company name to domain
    // e.g., "Google Inc" → "google.com"
    const cleaned = company
        .toLowerCase()
        .replace(/\s+(inc|llc|ltd|corporation|corp|limited)\.?$/i, '')
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '');

    return `${cleaned}.com`;
}

module.exports = {
    generateEmailPatterns,
    isValidEmail,
    findEmail,
    getDomainFromCompany
};
