/**
 * Snov.io API Integration (BUS-99)
 * Advanced email finder and enrichment source
 */

const SNOV_BASE_URL = 'https://api.snov.io/v1';

/**
 * Get Snov.io access token
 */
async function getSnovToken() {
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
        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Snov.io token error:', error.message);
        return null;
    }
}

/**
 * Find email by name and domain using Snov.io
 */
async function findEmailWithSnov(firstName, lastName, domain) {
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
        const data = await response.json();

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
        console.error('Snov.io email finder error:', error.message);
        return null;
    }
}

/**
 * Enrich person data using Snov.io
 */
async function enrichPersonWithSnov(email) {
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
        const data = await response.json();

        if (data.success && data.data) {
            return {
                first_name: data.data.firstName,
                last_name: data.data.lastName,
                job_title: data.data.currentJob?.[0]?.position,
                company: data.data.currentJob?.[0]?.companyName,
                location: data.data.locality,
                linkedin_url: data.data.social?.find(s => s.type === 'linkedin')?.link,
                source: 'snovio'
            };
        }

        return null;
    } catch (error) {
        console.error('Snov.io enrichment error:', error.message);
        return null;
    }
}

/**
 * Get company info from Snov.io
 */
async function getCompanyFromSnov(domain) {
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
        const data = await response.json();

        if (data.success) {
            return {
                domain,
                email_count: data.data?.emailCount || 0,
                source: 'snovio'
            };
        }

        return null;
    } catch (error) {
        console.error('Snov.io company error:', error.message);
        return null;
    }
}

module.exports = {
    findEmailWithSnov,
    enrichPersonWithSnov,
    getCompanyFromSnov
};
