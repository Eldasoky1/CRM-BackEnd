/**
 * Snov.io API Integration (BUS-99)
 * Advanced email finder and enrichment source
 */

const SNOV_BASE_URL = 'https://api.snov.io/v1';

interface SnovEmailResult {
    email: string;
    confidence: 'high' | 'medium' | 'low';
    source: string;
}

interface SnovEnrichmentResult {
    first_name: string | null;
    last_name: string | null;
    job_title: string | null;
    company: string | null;
    location: string | null;
    linkedin_url: string | null;
    source: string;
}

interface SnovCompanyResult {
    domain: string;
    email_count: number;
    source: string;
}

interface SnovTokenResponse {
    access_token?: string;
}

interface SnovEmailResponse {
    success: boolean;
    data?: {
        emails?: Array<{
            email: string;
            emailStatus: string;
        }>;
    };
}

interface SnovProfileResponse {
    success: boolean;
    data?: {
        firstName?: string;
        lastName?: string;
        currentJob?: Array<{
            position?: string;
            companyName?: string;
        }>;
        locality?: string;
        social?: Array<{
            type: string;
            link: string;
        }>;
    };
}

interface SnovDomainResponse {
    success: boolean;
    data?: {
        emailCount?: number;
    };
}

/**
 * Get Snov.io access token
 */
async function getSnovToken(): Promise<string | null> {
    if (!process.env.SNOV_CLIENT_ID || !process.env.SNOV_CLIENT_SECRET) {
        return null;
    }

    try {
        const response = await fetch(`${SNOV_BASE_URL}/oauth/access_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'client_credentials',
                client_id: process.env.SNOV_CLIENT_ID,
                client_secret: process.env.SNOV_CLIENT_SECRET
            })
        });

        if (!response.ok) return null;
        const data = await response.json() as SnovTokenResponse;
        return data.access_token || null;
    } catch (error) {
        console.error('Snov.io token error:', (error as Error).message);
        return null;
    }
}

/**
 * Find email by name and domain using Snov.io
 */
export async function findEmailWithSnov(firstName: string, lastName: string, domain: string): Promise<SnovEmailResult | null> {
    const token = await getSnovToken();
    if (!token) return null;

    console.log(`🔍 Snov.io: Finding email for ${firstName} ${lastName} @ ${domain}`);

    try {
        const response = await fetch(`${SNOV_BASE_URL}/get-emails-from-names`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                firstName,
                lastName,
                domain
            })
        });

        if (!response.ok) return null;
        const data = await response.json() as SnovEmailResponse;

        if (data.success && data.data && data.data.emails && data.data.emails.length > 0) {
            const bestEmail = data.data.emails[0];
            return {
                email: bestEmail.email,
                confidence: bestEmail.emailStatus === 'valid' ? 'high' : 'medium',
                source: 'snovio'
            };
        }

        return null;
    } catch (error) {
        console.error('Snov.io email finder error:', (error as Error).message);
        return null;
    }
}

/**
 * Enrich person data using Snov.io
 */
export async function enrichPersonWithSnov(email: string): Promise<SnovEnrichmentResult | null> {
    const token = await getSnovToken();
    if (!token || !email) return null;

    console.log(`👤 Snov.io: Enriching person data for ${email}`);

    try {
        const response = await fetch(`${SNOV_BASE_URL}/get-profile-by-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ email })
        });

        if (!response.ok) return null;
        const data = await response.json() as SnovProfileResponse;

        if (data.success && data.data) {
            return {
                first_name: data.data.firstName || null,
                last_name: data.data.lastName || null,
                job_title: data.data.currentJob?.[0]?.position || null,
                company: data.data.currentJob?.[0]?.companyName || null,
                location: data.data.locality || null,
                linkedin_url: data.data.social?.find(s => s.type === 'linkedin')?.link || null,
                source: 'snovio'
            };
        }

        return null;
    } catch (error) {
        console.error('Snov.io enrichment error:', (error as Error).message);
        return null;
    }
}

/**
 * Get company info from Snov.io
 */
export async function getCompanyFromSnov(domain: string): Promise<SnovCompanyResult | null> {
    const token = await getSnovToken();
    if (!token || !domain) return null;

    console.log(`🏢 Snov.io: Getting company info for ${domain}`);

    try {
        const response = await fetch(`${SNOV_BASE_URL}/get-domain-emails-count`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ domain })
        });

        if (!response.ok) return null;
        const data = await response.json() as SnovDomainResponse;

        if (data.success) {
            return {
                domain,
                email_count: data.data?.emailCount || 0,
                source: 'snovio'
            };
        }

        return null;
    } catch (error) {
        console.error('Snov.io company error:', (error as Error).message);
        return null;
    }
}
