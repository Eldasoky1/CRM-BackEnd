/**
 * Clearbit API Integration (BUS-81)
 * Fallback enrichment source
 */

const CLEARBIT_API_KEY = process.env.CLEARBIT_API_KEY;

/**
 * Enrich a person by email
 */
async function enrichPersonWithClearbit(email) {
    if (!CLEARBIT_API_KEY) {
        console.log('⚠️ Clearbit API key not configured, skipping...');
        return null;
    }

    console.log(`🔍 Enriching with Clearbit: ${email}`);

    try {
        const response = await fetch(`https://person.clearbit.com/v2/people/find?email=${email}`, {
            headers: {
                'Authorization': `Bearer ${CLEARBIT_API_KEY}`
            }
        });

        if (response.status === 404) {
            return null; // Person not found
        }

        if (!response.ok) {
            console.error(`Clearbit API error: ${response.status}`);
            return null;
        }

        const person = await response.json();

        return {
            first_name: person.name?.givenName,
            last_name: person.name?.familyName,
            email: person.email,
            job_title: person.employment?.title,
            company: person.employment?.name,
            location: person.location,
            linkedin_url: person.linkedin?.handle ? `https://linkedin.com/in/${person.linkedin.handle}` : null,
            source: 'clearbit'
        };

    } catch (error) {
        console.error('Clearbit enrichment error:', error.message);
        return null;
    }
}

/**
 * Enrich company by domain
 */
async function enrichCompanyWithClearbit(domain) {
    if (!CLEARBIT_API_KEY) return null;

    console.log(`🏢 Enriching company with Clearbit: ${domain}`);

    try {
        const response = await fetch(`https://company.clearbit.com/v2/companies/find?domain=${domain}`, {
            headers: {
                'Authorization': `Bearer ${CLEARBIT_API_KEY}`
            }
        });

        if (!response.ok) return null;

        const company = await response.json();

        return {
            company_name: company.name,
            industry: company.category?.industry,
            company_size: company.metrics?.employees,
            company_revenue: company.metrics?.estimatedAnnualRevenue,
            description: company.description,
            website: company.domain,
            source: 'clearbit'
        };

    } catch (error) {
        console.error('Clearbit company enrichment error:', error.message);
        return null;
    }
}

module.exports = { enrichPersonWithClearbit, enrichCompanyWithClearbit };
