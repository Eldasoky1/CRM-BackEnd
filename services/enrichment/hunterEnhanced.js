/**
 * Enhanced Hunter.io Integration (BUS-99)
 * Advanced email verification and domain search
 */

const HUNTER_BASE_URL = 'https://api.hunter.io/v2';

/**
 * Verify email using Hunter.io
 */
async function verifyEmailWithHunter(email) {
    if (!process.env.HUNTER_API_KEY || !email) return null;

    console.log(`✅ Hunter.io: Verifying email ${email}`);

    try {
        const url = `${HUNTER_BASE_URL}/email-verifier?email=${encodeURIComponent(email)}&api_key=${process.env.HUNTER_API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) return null;
        const data = await response.json();

        if (data.data) {
            return {
                email,
                status: data.data.status, // valid, invalid, accept_all, webmail, disposable, unknown
                score: data.data.score,
                isDeliverable: data.data.status === 'valid' || data.data.status === 'accept_all',
                source: 'hunter'
            };
        }

        return null;
    } catch (error) {
        console.error('Hunter.io verification error:', error.message);
        return null;
    }
}

/**
 * Domain search - find all emails for a company domain
 */
async function searchDomainWithHunter(domain, limit = 10) {
    if (!process.env.HUNTER_API_KEY || !domain) return null;

    console.log(`🔍 Hunter.io: Searching domain ${domain}`);

    try {
        const url = `${HUNTER_BASE_URL}/domain-search?domain=${encodeURIComponent(domain)}&limit=${limit}&api_key=${process.env.HUNTER_API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) return null;
        const data = await response.json();

        if (data.data) {
            return {
                domain: data.data.domain,
                organization: data.data.organization,
                industry: data.data.industry,
                emails: data.data.emails?.map(e => ({
                    email: e.value,
                    firstName: e.first_name,
                    lastName: e.last_name,
                    position: e.position,
                    confidence: e.confidence,
                    department: e.department
                })) || [],
                linkedinUrl: data.data.linkedin,
                twitterHandle: data.data.twitter,
                facebookHandle: data.data.facebook,
                source: 'hunter'
            };
        }

        return null;
    } catch (error) {
        console.error('Hunter.io domain search error:', error.message);
        return null;
    }
}

/**
 * Find email with confidence score
 */
async function findEmailWithHunterEnhanced(firstName, lastName, domain) {
    if (!process.env.HUNTER_API_KEY) return null;

    console.log(`📧 Hunter.io: Finding email for ${firstName} ${lastName} @ ${domain}`);

    try {
        const url = `${HUNTER_BASE_URL}/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${process.env.HUNTER_API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) return null;
        const data = await response.json();

        if (data.data && data.data.email) {
            return {
                email: data.data.email,
                confidence: data.data.score >= 80 ? 'high' : data.data.score >= 50 ? 'medium' : 'low',
                score: data.data.score,
                position: data.data.position,
                twitter: data.data.twitter,
                linkedin: data.data.linkedin_url,
                phone: data.data.phone_number,
                source: 'hunter'
            };
        }

        return null;
    } catch (error) {
        console.error('Hunter.io email finder error:', error.message);
        return null;
    }
}

/**
 * Get email count for a domain
 */
async function getEmailCountForDomain(domain) {
    if (!process.env.HUNTER_API_KEY || !domain) return 0;

    try {
        const url = `${HUNTER_BASE_URL}/email-count?domain=${encodeURIComponent(domain)}&api_key=${process.env.HUNTER_API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) return 0;
        const data = await response.json();

        return data.data?.total || 0;
    } catch (error) {
        console.error('Hunter.io email count error:', error.message);
        return 0;
    }
}

module.exports = {
    verifyEmailWithHunter,
    searchDomainWithHunter,
    findEmailWithHunterEnhanced,
    getEmailCountForDomain
};
