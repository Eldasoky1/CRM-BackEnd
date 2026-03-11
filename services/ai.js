const OpenAI = require('openai');

// Lazy initialization to avoid crashing on module load if API key is missing
let openai = null;

function getOpenAIClient() {
    if (!openai) {
        if (!process.env.OPENAI_API_KEY) {
            console.warn('⚠️ OPENAI_API_KEY not set. AI features will be disabled.');
            return null;
        }
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openai;
}

/**
 * Enhanced AI Prompts (BUS-76)
 * Specialized prompts for different use cases
 */
const AI_PROMPTS = {
    leadEnrichment: (data) => `
You are an expert lead enrichment assistant for a CRM system.

TASK: Analyze the following scraped data and extract structured lead information.

SCRAPED DATA:
Title: ${data.title || 'N/A'}
Meta Description: ${data.meta_description || 'N/A'}
Main Content: ${data.body_text || data.h1 || ''}

REQUIREMENTS:
1. Extract: first_name, last_name, job_title, company, location, email
2. Email: Only include if explicitly found. DO NOT GUESS.
3. Generate a concise ai_summary (1-2 sentences) about why this lead is valuable
4. Assign lead_score (0-100) based on:
   - Profile completeness (30 points)
   - Professional relevance (30 points)
   - Seniority/Authority (20 points)
   - Contact information availability (20 points)

Return ONLY valid JSON with this exact structure:
{
    "first_name": "string or null",
    "last_name": "string or null",
    "job_title": "string or null",
    "company": "string or null",
    "location": "string or null",
    "email": "string or null",
    "ai_summary": "string",
    "lead_score": number
}`,

    websiteMetadata: (url, data) => `
Extract company/person metadata from this website:

URL: ${url}
Title: ${data.title}
Description: ${data.meta_description}
Content Preview: ${data.body_text?.substring(0, 500)}

Return JSON with:
{
    "company_name": "string or null",
    "industry": "string or null",
    "company_size": "string or null",
    "description": "string",
    "contact_email": "string or null",
    "phone": "string or null"
}`,

    textParsing: (text) => `
Parse the following text and extract ANY lead information you can find.
This could be from an email signature, business card, LinkedIn message, etc.

TEXT:
${text}

Extract and return JSON:
{
    "first_name": "string or null",
    "last_name": "string or null",
    "job_title": "string or null",
    "company": "string or null",
    "location": "string or null",
    "email": "string or null",
    "phone": "string or null",
    "ai_summary": "Brief note about this lead",
    "lead_score": number
}`,

    autoTag: (lead) => `
Analyze this lead and suggest relevant tags for categorization.

Lead Data:
- Name: ${lead.first_name || ''} ${lead.last_name || ''}
- Job Title: ${lead.job_title || 'Unknown'}
- Company: ${lead.company || 'Unknown'}
- Industry: ${lead.industry || 'Unknown'}
- AI Summary: ${lead.ai_summary || 'No summary available'}

Return a JSON array of suggested tags (max 5). Focus on:
- Role type (decision-maker, influencer, end-user)
- Industry vertical
- Company size category
- Engagement potential
- Lead quality tier

Example response: ["decision-maker", "saas", "enterprise", "high-priority", "tech-industry"]

Return ONLY the JSON array, no other text.`
};

/**
 * Field Validation & Extraction (BUS-79)
 */
function validateAndCleanFields(data) {
    const cleaned = { ...data };

    // Email validation
    if (cleaned.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleaned.email)) {
            cleaned.email = null;
        }
    }

    // Phone validation (basic)
    if (cleaned.phone) {
        const phoneRegex = /[\d\s\-\(\)\+]{7,}/;
        if (!phoneRegex.test(cleaned.phone)) {
            cleaned.phone = null;
        }
    }

    // Lead score bounds
    if (cleaned.lead_score) {
        cleaned.lead_score = Math.max(0, Math.min(100, cleaned.lead_score));
    }

    // Clean empty strings
    Object.keys(cleaned).forEach(key => {
        if (cleaned[key] === '' || cleaned[key] === 'N/A' || cleaned[key] === 'Unknown') {
            cleaned[key] = null;
        }
    });

    return cleaned;
}

/**
 * Main Enrichment Function with Enhanced Prompts
 */
async function enrichLeadWithAI(rawData, options = {}) {
    const { type = 'leadEnrichment' } = options;

    console.log(`🤖 AI Processing (${type})...`);

    let prompt;
    switch (type) {
        case 'website':
            prompt = AI_PROMPTS.websiteMetadata(rawData.url, rawData);
            break;
        case 'text':
            prompt = AI_PROMPTS.textParsing(rawData.text || rawData.body_text);
            break;
        default:
            prompt = AI_PROMPTS.leadEnrichment(rawData);
    }

    try {
        const client = getOpenAIClient();
        if (!client) {
            console.warn('⚠️ OpenAI client not available, returning empty enrichment');
            return {
                first_name: null,
                last_name: null,
                job_title: null,
                company: null,
                email: null,
                phone: null,
                lead_score: 0,
                confidence: 0
            };
        }

        const completion = await client.chat.completions.create({
            messages: [
                { role: "system", content: "You are a helpful assistant that returns ONLY valid JSON." },
                { role: "user", content: prompt }
            ],
            model: "gpt-4o-mini", // 2.5M tokens/day free tier - perfect for lead enrichment
        });

        const responseText = completion.choices[0].message.content;

        // Try to parse JSON from the response
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            // If response has markdown code blocks, extract JSON
            const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[1]);
            } else {
                throw parseError;
            }
        }

        // Validate and clean the extracted fields (BUS-79)
        const cleanedResult = validateAndCleanFields(result);

        return cleanedResult;

    } catch (error) {
        console.error("AI Enrichment Error:", error);
        // Return a fallback object so the flow doesn't break
        return {
            ai_summary: "AI processing failed.",
            lead_score: 0
        };
    }
}

/**
 * Website Metadata Extractor (BUS-78)
 * Enhanced metadata extraction with AI
 */
async function extractWebsiteMetadata(url, scrapedData) {
    console.log(`🌐 Extracting metadata from ${url}`);

    try {
        const metadata = await enrichLeadWithAI(
            { ...scrapedData, url },
            { type: 'website' }
        );
        return metadata;
    } catch (error) {
        console.error("Metadata extraction error:", error);
        return {
            description: scrapedData.meta_description || '',
            company_name: null,
            industry: null
        };
    }
}

/**
 * Generate auto-tags for a lead using AI (BUS-90)
 */
async function generateAutoTags(lead) {
    console.log(`🏷️ Generating auto-tags for lead: ${lead.first_name} ${lead.last_name}`);

    try {
        const client = getOpenAIClient();
        if (!client) {
            console.warn('⚠️ OpenAI client not available, returning default tags');
            return [];
        }

        const completion = await client.chat.completions.create({
            messages: [
                { role: "system", content: "You are a helpful assistant that returns ONLY valid JSON arrays." },
                { role: "user", content: AI_PROMPTS.autoTag(lead) }
            ],
            model: "gpt-4o-mini",
            temperature: 0.3,
            max_tokens: 200
        });

        const responseText = completion.choices[0].message.content;

        // Parse the JSON array
        let tags;
        try {
            tags = JSON.parse(responseText);
        } catch (parseError) {
            // Try to extract array from response
            const arrayMatch = responseText.match(/\[[\s\S]*?\]/);
            if (arrayMatch) {
                tags = JSON.parse(arrayMatch[0]);
            } else {
                throw parseError;
            }
        }

        // Ensure it's an array and limit to 5 tags
        if (Array.isArray(tags)) {
            return tags.slice(0, 5).map(tag => tag.toLowerCase().trim());
        }

        return [];
    } catch (error) {
        console.error('Auto-tag generation failed:', error);
        return [];
    }
}

module.exports = {
    enrichLeadWithAI,
    extractWebsiteMetadata,
    validateAndCleanFields,
    generateAutoTags
};
