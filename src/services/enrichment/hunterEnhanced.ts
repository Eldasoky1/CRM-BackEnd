/**
 * Enhanced Hunter.io Integration (BUS-99)
 * Advanced email verification and domain search
 */

const HUNTER_BASE_URL = 'https://api.hunter.io/v2';

interface EmailVerification {
    email: string;
    status: string;
    score: number;
    isDeliverable: boolean;
    source: string;
}

interface DomainEmail {
    email: string;
    firstName: string | null;
    lastName: string | null;
    position: string | null;
    confidence: number;
    department: string | null;
}

interface DomainSearchResult {
    domain: string;
    organization: string | null;
    industry: string | null;
    emails: DomainEmail[];
    linkedinUrl: string | null;
    twitterHandle: string | null;
    facebookHandle: string | null;
    source: string;
}

interface EmailFinderResult {
    email: string;
    confidence: 'high' | 'medium' | 'low';
    score: number;
    position: string | null;
    twitter: string | null;
    linkedin: string | null;
    phone: string | null;
    source: string;
}

interface HunterVerifyResponse {
    data?: {
        status: string;
        score: number;
    };
}

interface HunterDomainResponse {
    data?: {
        domain: string;
        organization: string;
        industry: string;
        emails?: Array<{
            value: string;
            first_name: string;
            last_name: string;
            position: string;
            confidence: number;
            department: string;
        }>;
        linkedin: string;
        twitter: string;
        facebook: string;
    };
}

interface HunterEmailFinderResponse {
    data?: {
        email: string;
        score: number;
        position: string;
        twitter: string;
        linkedin_url: string;
        phone_number: string;
    };
}

interface HunterEmailCountResponse {
    data?: {
        total: number;
    };
}

/**
 * Verify email using Hunter.io
 */
export async function verifyEmailWithHunter(email: string): Promise<EmailVerification | null> {
    if (!process.env.HUNTER_API_KEY || !email) return null;

    console.log(`✅ Hunter.io: Verifying email ${email}`);

    try {
        const url = `${HUNTER_BASE_URL}/email-verifier?email=${encodeURIComponent(email)}&api_key=${process.env.HUNTER_API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) return null;
        const data = await response.json() as HunterVerifyResponse;

        if (data.data) {
            return {
                email,
                status: data.data.status,
                score: data.data.score,
                isDeliverable: data.data.status === 'valid' || data.data.status === 'accept_all',
                source: 'hunter'
            };
        }

        return null;
    } catch (error) {
        console.error('Hunter.io verification error:', (error as Error).message);
        return null;
    }
}

/**
 * Domain search - find all emails for a company domain
 */
export async function searchDomainWithHunter(domain: string, limit: number = 10): Promise<DomainSearchResult | null> {
    if (!process.env.HUNTER_API_KEY || !domain) return null;

    console.log(`🔍 Hunter.io: Searching domain ${domain}`);

    try {
        const url = `${HUNTER_BASE_URL}/domain-search?domain=${encodeURIComponent(domain)}&limit=${limit}&api_key=${process.env.HUNTER_API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) return null;
        const data = await response.json() as HunterDomainResponse;

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
        console.error('Hunter.io domain search error:', (error as Error).message);
        return null;
    }
}

/**
 * Find email with confidence score
 */
export async function findEmailWithHunterEnhanced(firstName: string, lastName: string, domain: string): Promise<EmailFinderResult | null> {
    if (!process.env.HUNTER_API_KEY) return null;

    console.log(`📧 Hunter.io: Finding email for ${firstName} ${lastName} @ ${domain}`);

    try {
        const url = `${HUNTER_BASE_URL}/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${process.env.HUNTER_API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) return null;
        const data = await response.json() as HunterEmailFinderResponse;

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
        console.error('Hunter.io email finder error:', (error as Error).message);
        return null;
    }
}

/**
 * Get email count for a domain
 */
export async function getEmailCountForDomain(domain: string): Promise<number> {
    if (!process.env.HUNTER_API_KEY || !domain) return 0;

    try {
        const url = `${HUNTER_BASE_URL}/email-count?domain=${encodeURIComponent(domain)}&api_key=${process.env.HUNTER_API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) return 0;
        const data = await response.json() as HunterEmailCountResponse;

        return data.data?.total || 0;
    } catch (error) {
        console.error('Hunter.io email count error:', (error as Error).message);
        return 0;
    }
}
