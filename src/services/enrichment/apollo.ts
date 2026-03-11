/**
 * Apollo.io API Integration (BUS-80)
 * For contact and company enrichment
 * Converted to TypeScript with proper type definitions
 */

const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
const APOLLO_BASE_URL = 'https://api.apollo.io/v1';

interface ApolloPersonResult {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    job_title: string | null;
    company: string | null;
    location: string | null;
    linkedin_url: string | null;
    source: string;
}

interface ApolloCompanyResult {
    company_name: string | null;
    industry: string | null;
    company_size: string | number | null;
    company_revenue: string | null;
    description: string | null;
    website: string | null;
    source: string;
}

interface ApolloPersonResponse {
    person?: {
        first_name?: string;
        last_name?: string;
        email?: string;
        phone_numbers?: Array<{ raw_number?: string }>;
        title?: string;
        organization?: { name?: string };
        city?: string;
        state?: string;
        country?: string;
        linkedin_url?: string;
    };
}

interface ApolloOrgResponse {
    organization?: {
        name?: string;
        industry?: string;
        estimated_num_employees?: number;
        annual_revenue?: string;
        short_description?: string;
        website_url?: string;
    };
}

/**
 * Enrich a person by LinkedIn URL or email
 */
export async function enrichPersonWithApollo(
    identifier: string
): Promise<ApolloPersonResult | null> {
    if (!APOLLO_API_KEY) {
        console.log('⚠️ Apollo API key not configured, skipping...');
        return null;
    }

    console.log(`🚀 Enriching with Apollo: ${identifier}`);

    try {
        const params = new URLSearchParams();

        if (identifier.includes('linkedin.com')) {
            params.append('linkedin_url', identifier);
        } else if (identifier.includes('@')) {
            params.append('email', identifier);
        } else {
            return null;
        }

        const response = await fetch(`${APOLLO_BASE_URL}/people/match?${params}`, {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': APOLLO_API_KEY
            }
        });

        if (!response.ok) {
            console.error(`Apollo API error: ${response.status}`);
            return null;
        }

        const data = await response.json() as ApolloPersonResponse;
        const person = data.person;

        if (!person) return null;

        return {
            first_name: person.first_name || null,
            last_name: person.last_name || null,
            email: person.email || null,
            phone: person.phone_numbers?.[0]?.raw_number || null,
            job_title: person.title || null,
            company: person.organization?.name || null,
            location: person.city
                ? `${person.city}, ${person.state || person.country}`
                : null,
            linkedin_url: person.linkedin_url || null,
            source: 'apollo'
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Apollo enrichment error:', errorMessage);
        return null;
    }
}

/**
 * Enrich company data
 */
export async function enrichCompanyWithApollo(
    domain: string
): Promise<ApolloCompanyResult | null> {
    if (!APOLLO_API_KEY) return null;

    console.log(`🏢 Enriching company with Apollo: ${domain}`);

    try {
        const response = await fetch(
            `${APOLLO_BASE_URL}/organizations/enrich?domain=${domain}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': APOLLO_API_KEY
                }
            }
        );

        if (!response.ok) return null;

        const data = await response.json() as ApolloOrgResponse;
        const org = data.organization;

        if (!org) return null;

        return {
            company_name: org.name || null,
            industry: org.industry || null,
            company_size: org.estimated_num_employees || null,
            company_revenue: org.annual_revenue || null,
            description: org.short_description || null,
            website: org.website_url || null,
            source: 'apollo'
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Apollo company enrichment error:', errorMessage);
        return null;
    }
}
