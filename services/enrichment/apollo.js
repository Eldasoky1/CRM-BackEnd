/**
 * Apollo.io API Integration (BUS-80)
 * For contact and company enrichment
 */

const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
const APOLLO_BASE_URL = 'https://api.apollo.io/v1';

/**
 * Enrich a person by LinkedIn URL or email
 */
async function enrichPersonWithApollo(identifier) {
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

        const data = await response.json();
        const person = data.person;

        if (!person) return null;

        return {
            first_name: person.first_name,
            last_name: person.last_name,
            email: person.email,
            phone: person.phone_numbers?.[0]?.raw_number,
            job_title: person.title,
            company: person.organization?.name,
            location: person.city ? `${person.city}, ${person.state || person.country}` : null,
            linkedin_url: person.linkedin_url,
            source: 'apollo'
        };

    } catch (error) {
        console.error('Apollo enrichment error:', error.message);
        return null;
    }
}

/**
 * Enrich company data
 */
async function enrichCompanyWithApollo(domain) {
    if (!APOLLO_API_KEY) return null;

    console.log(`🏢 Enriching company with Apollo: ${domain}`);

    try {
        const response = await fetch(`${APOLLO_BASE_URL}/organizations/enrich?domain=${domain}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': APOLLO_API_KEY
            }
        });

        if (!response.ok) return null;

        const data = await response.json();
        const org = data.organization;

        return {
            company_name: org.name,
            industry: org.industry,
            company_size: org.estimated_num_employees,
            company_revenue: org.annual_revenue,
            description: org.short_description,
            website: org.website_url,
            source: 'apollo'
        };

    } catch (error) {
        console.error('Apollo company enrichment error:', error.message);
        return null;
    }
}

module.exports = { enrichPersonWithApollo, enrichCompanyWithApollo };
