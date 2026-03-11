/**
 * Clearbit API Integration (BUS-81)
 * Fallback enrichment source
 * Converted to TypeScript with proper type definitions
 */

const CLEARBIT_API_KEY = process.env.CLEARBIT_API_KEY;

interface ClearbitPersonResult {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    job_title: string | null;
    company: string | null;
    location: string | null;
    linkedin_url: string | null;
    source: string;
}

interface ClearbitCompanyResult {
    company_name: string | null;
    industry: string | null;
    company_size: number | null;
    company_revenue: string | null;
    description: string | null;
    website: string | null;
    source: string;
}

interface ClearbitPersonResponse {
    name?: {
        givenName?: string;
        familyName?: string;
    };
    email?: string;
    employment?: {
        title?: string;
        name?: string;
    };
    location?: string;
    linkedin?: {
        handle?: string;
    };
}

interface ClearbitCompanyResponse {
    name?: string;
    category?: {
        industry?: string;
    };
    metrics?: {
        employees?: number;
        estimatedAnnualRevenue?: string;
    };
    description?: string;
    domain?: string;
}

/**
 * Enrich a person by email
 */
export async function enrichPersonWithClearbit(
    email: string
): Promise<ClearbitPersonResult | null> {
    if (!CLEARBIT_API_KEY) {
        console.log('⚠️ Clearbit API key not configured, skipping...');
        return null;
    }

    console.log(`🔍 Enriching with Clearbit: ${email}`);

    try {
        const response = await fetch(
            `https://person.clearbit.com/v2/people/find?email=${email}`,
            {
                headers: {
                    'Authorization': `Bearer ${CLEARBIT_API_KEY}`
                }
            }
        );

        if (response.status === 404) {
            return null; // Person not found
        }

        if (!response.ok) {
            console.error(`Clearbit API error: ${response.status}`);
            return null;
        }

        const person = await response.json() as ClearbitPersonResponse;

        return {
            first_name: person.name?.givenName || null,
            last_name: person.name?.familyName || null,
            email: person.email || null,
            job_title: person.employment?.title || null,
            company: person.employment?.name || null,
            location: person.location || null,
            linkedin_url: person.linkedin?.handle
                ? `https://linkedin.com/in/${person.linkedin.handle}`
                : null,
            source: 'clearbit'
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Clearbit enrichment error:', errorMessage);
        return null;
    }
}

/**
 * Enrich company by domain
 */
export async function enrichCompanyWithClearbit(
    domain: string
): Promise<ClearbitCompanyResult | null> {
    if (!CLEARBIT_API_KEY) return null;

    console.log(`🏢 Enriching company with Clearbit: ${domain}`);

    try {
        const response = await fetch(
            `https://company.clearbit.com/v2/companies/find?domain=${domain}`,
            {
                headers: {
                    'Authorization': `Bearer ${CLEARBIT_API_KEY}`
                }
            }
        );

        if (!response.ok) return null;

        const company = await response.json() as ClearbitCompanyResponse;

        return {
            company_name: company.name || null,
            industry: company.category?.industry || null,
            company_size: company.metrics?.employees || null,
            company_revenue: company.metrics?.estimatedAnnualRevenue || null,
            description: company.description || null,
            website: company.domain || null,
            source: 'clearbit'
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Clearbit company enrichment error:', errorMessage);
        return null;
    }
}
