const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const { createClient } = require('@supabase/supabase-js');
const { scrapeProfile } = require('./services/scraper');
const { calculateLeadScore, findDuplicates, leadsToCSV } = require('./services/utils/week2Utils');
const { enrichLeadWithAI, generateAutoTags } = require('./services/ai');
const { logger, requestLogger } = require('./services/utils/logger');
const { globalErrorHandler, notFoundHandler, asyncHandler } = require('./services/utils/errorHandler');
const { webhookManager } = require('./services/webhooks');
const { startScheduler, getQueueStatus, addToQueue } = require('./services/jobs/enrichmentWorker');
const { enrichWithWaterfall } = require('./services/enrichment/waterfall');
const { batchEnrichByUser, batchEnrichByIds } = require('./services/enrichment/batchEnrichment');

// --- CONFIGURATION ---
const app = express();
const port = process.env.PORT || 5000;

// Cache instance (TTL: 5 minutes)
const cache = new NodeCache({ stdTTL: 300 });

// Load OpenAPI spec
let swaggerDocument;
try {
    swaggerDocument = YAML.load(path.join(__dirname, 'openapi.yaml'));
} catch (e) {
    console.warn('OpenAPI spec not found, Swagger UI disabled');
}

// Rate limiting middleware
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

const strictLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute for expensive operations
    message: { error: 'Rate limit exceeded for this operation' }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use('/api/', apiLimiter);

// Swagger UI
if (swaggerDocument) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'LeadCatch API Documentation'
    }));
}

// Database Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- ROUTES ---

/**
 * Health Check
 */
app.get('/', (req, res) => {
    res.json({ status: 'active', system: 'LeadCatch API v1' });
});

/**
 * 1. CREATE SCRAPE JOB (The Entry Point)
 * Receives a LinkedIn URL, creates a job, scrapes it, and enriches with AI.
 */
app.post('/api/scrape', async (req, res) => {
    const { userId, targetUrl, platform } = req.body;

    try {
        // A. Log the job in DB
        const { data: job, error: jobError } = await supabase
            .from('scrape_jobs')
            .insert([{ user_id: userId, target_url: targetUrl, status: 'pending' }])
            .select()
            .single();

        if (jobError) throw jobError;

        // B. Trigger the Real Scraper
        console.log(`🕷️ Starting scrape for ${targetUrl}`);
        let scrapedRawData;
        try {
            scrapedRawData = await scrapeProfile(targetUrl);
        } catch (scrapeErr) {
            console.error("Scrape failed, but continuing with partial data if possible", scrapeErr);
            // Update job to failed but don't crash the whole request if we can avoid it
            // For now, we will throw to stop the flow, or we could pass empty data to AI
            await supabase.from('scrape_jobs').update({ status: 'failed', error_log: scrapeErr.message }).eq('id', job.id);
            throw scrapeErr;
        }

        // C. Trigger AI Enrichment
        const aiData = await enrichLeadWithAI(scrapedRawData);

        // D. Save Final Lead to DB
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .insert([{
                user_id: userId,
                first_name: aiData.first_name || 'Unknown',
                last_name: aiData.last_name || 'Unknown',
                job_title: aiData.job_title,
                company: aiData.company,
                location: aiData.location,
                email: aiData.email,

                linkedin_url: targetUrl,
                source_platform: platform || 'linkedin',

                is_enriched: true,
                ai_summary: aiData.ai_summary,
                lead_score: aiData.lead_score
            }])
            .select();

        if (leadError) throw leadError;

        // E. Update Job Status
        await supabase
            .from('scrape_jobs')
            .update({ status: 'completed' })
            .eq('id', job.id);

        res.status(200).json({ message: 'Scrape and enrichment successful', lead });

    } catch (error) {
        console.error('Scrape Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 2. GET ALL LEADS
 * Fetch leads for the dashboard (BUS-52)
 */
app.get('/api/leads/:userId', async (req, res) => {
    const { userId } = req.params;
    const { status, platform, minScore } = req.query;

    let query = supabase
        .from('leads')
        .select('*')
        .eq('user_id', userId);

    // Optional filters
    if (status) query = query.eq('status', status);
    if (platform) query = query.eq('source_platform', platform);
    if (minScore) query = query.gte('lead_score', parseInt(minScore));

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

/**
 * 3. GET SINGLE LEAD (BUS-53)
 * Fetch a specific lead by ID
 */
app.get('/api/leads/:userId/:leadId', async (req, res) => {
    const { userId, leadId } = req.params;

    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .eq('user_id', userId)
        .single();

    if (error) return res.status(404).json({ error: 'Lead not found' });
    res.json(data);
});

/**
 * 4. CREATE LEAD MANUALLY (BUS-49)
 * Add a lead without scraping
 */
app.post('/api/leads', async (req, res) => {
    const { userId, first_name, last_name, email, phone, job_title, company, location, linkedin_url } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        const { data, error } = await supabase
            .from('leads')
            .insert([{
                user_id: userId,
                first_name,
                last_name,
                email,
                phone,
                job_title,
                company,
                location,
                linkedin_url,
                source_platform: 'manual',
                is_enriched: false,
                lead_score: 0
            }])
            .select();

        if (error) throw error;
        res.status(201).json({ message: 'Lead created successfully', lead: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 5. UPDATE LEAD (BUS-54)
 * Update lead information
 */
app.patch('/api/leads/:leadId', async (req, res) => {
    const { leadId } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.user_id;
    delete updates.created_at;

    updates.updated_at = new Date().toISOString();

    try {
        const { data, error } = await supabase
            .from('leads')
            .update(updates)
            .eq('id', leadId)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        res.json({ message: 'Lead updated successfully', lead: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 6. DELETE LEAD (BUS-55)
 * Remove a lead
 */
app.delete('/api/leads/:leadId', async (req, res) => {
    const { leadId } = req.params;

    try {
        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', leadId);

        if (error) throw error;
        res.json({ message: 'Lead deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 7. AI PARSE TEXT (BUS-50)
 * Extract lead data from free-form text using AI
 */
app.post('/api/leads/parse', async (req, res) => {
    const { userId, text } = req.body;

    if (!text || !userId) {
        return res.status(400).json({ error: 'userId and text are required' });
    }

    try {
        const aiData = await enrichLeadWithAI({ body_text: text, title: 'Parsed Text' });

        const { data, error } = await supabase
            .from('leads')
            .insert([{
                user_id: userId,
                first_name: aiData.first_name || 'Unknown',
                last_name: aiData.last_name || 'Unknown',
                email: aiData.email,
                job_title: aiData.job_title,
                company: aiData.company,
                location: aiData.location,
                source_platform: 'text_parse',
                is_enriched: true,
                ai_summary: aiData.ai_summary,
                lead_score: aiData.lead_score
            }])
            .select();

        if (error) throw error;
        res.status(201).json({ message: 'Lead parsed and created successfully', lead: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 8. CSV IMPORT (BUS-51)
 * Bulk import leads from CSV data
 */
app.post('/api/leads/import', async (req, res) => {
    const { userId, leads } = req.body;

    if (!userId || !Array.isArray(leads) || leads.length === 0) {
        return res.status(400).json({ error: 'userId and leads array are required' });
    }

    try {
        const leadsToInsert = leads.map(lead => ({
            user_id: userId,
            first_name: lead.first_name || lead.firstName || '',
            last_name: lead.last_name || lead.lastName || '',
            email: lead.email || '',
            phone: lead.phone || '',
            job_title: lead.job_title || lead.jobTitle || '',
            company: lead.company || '',
            location: lead.location || '',
            linkedin_url: lead.linkedin_url || lead.linkedinUrl || '',
            source_platform: 'csv_import',
            is_enriched: false,
            lead_score: 0
        }));

        const { data, error } = await supabase
            .from('leads')
            .insert(leadsToInsert)
            .select();

        if (error) throw error;
        res.status(201).json({
            message: `Successfully imported ${data.length} leads`,
            leads: data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 9. ENRICH LEAD MANUALLY (BUS-83)
 * Trigger enrichment for an existing lead
 */
app.post('/api/leads/:leadId/enrich', async (req, res) => {
    const { leadId } = req.params;

    try {
        const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        const enrichedData = await enrichLeadWithAI({
            body_text: `${lead.first_name} ${lead.last_name} ${lead.job_title} ${lead.company}`,
            title: lead.linkedin_url || ''
        });

        const newScore = calculateLeadScore({ ...lead, ...enrichedData });

        const { data: updated } = await supabase
            .from('leads')
            .update({
                ...enrichedData,
                lead_score: newScore,
                is_enriched: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', leadId)
            .select();

        res.json({ message: 'Lead enriched successfully', lead: updated[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 10. CALCULATE LEAD SCORE (BUS-89)
 */
app.post('/api/leads/:leadId/score', async (req, res) => {
    const { leadId } = req.params;

    try {
        const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        const score = calculateLeadScore(lead);

        await supabase.from('leads').update({ lead_score: score }).eq('id', leadId);

        res.json({ leadId, score });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 11. FIND DUPLICATES (BUS-93)
 */
app.post('/api/leads/dedupe', async (req, res) => {
    const { userId } = req.body;

    try {
        const duplicates = await findDuplicates(supabase, userId);
        res.json({ duplicates, count: duplicates.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 12. EXPORT LEADS (BUS-94)
 */
app.get('/api/leads/:userId/export', async (req, res) => {
    const { userId } = req.params;

    try {
        const { data: leads } = await supabase
            .from('leads')
            .select('*')
            .eq('user_id', userId);

        const csv = leadsToCSV(leads);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="leads_${Date.now()}.csv"`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 13. BULK OPERATIONS (BUS-95)
 */
app.post('/api/leads/bulk', async (req, res) => {
    const { action, leadIds, updates } = req.body;

    try {
        if (action === 'delete') {
            await supabase.from('leads').delete().in('id', leadIds);
            res.json({ message: `Deleted ${leadIds.length} leads` });
        } else if (action === 'update') {
            await supabase.from('leads').update(updates).in('id', leadIds);
            res.json({ message: `Updated ${leadIds.length} leads` });
        } else {
            res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 14. SEARCH LEADS (BUS-96)
 */
app.get('/api/leads/search', async (req, res) => {
    const { userId, q } = req.query;

    try {
        const { data } = await supabase
            .from('leads')
            .select('*')
            .eq('user_id', userId)
            .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,company.ilike.%${q}%,email.ilike.%${q}%`);

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 15-18. NOTES CRUD (BUS-97)
 */
app.post('/api/leads/:leadId/notes', async (req, res) => {
    const { leadId } = req.params;
    const { userId, content } = req.body;

    try {
        const { data } = await supabase
            .from('notes')
            .insert([{ lead_id: leadId, user_id: userId, content }])
            .select();

        res.status(201).json({ note: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/leads/:leadId/notes', async (req, res) => {
    const { leadId } = req.params;

    try {
        const { data } = await supabase.from('notes').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/notes/:noteId', async (req, res) => {
    const { noteId } = req.params;

    try {
        await supabase.from('notes').delete().eq('id', noteId);
        res.json({ message: 'Note deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 19-21. TAGS CRUD (BUS-98)
 */
app.post('/api/tags', async (req, res) => {
    const { userId, name, color } = req.body;

    try {
        const { data } = await supabase
            .from('tags')
            .insert([{ user_id: userId, name, color: color || '#6366f1' }])
            .select();

        res.status(201).json({ tag: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tags/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const { data } = await supabase.from('tags').select('*').eq('user_id', userId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/leads/:leadId/tags', async (req, res) => {
    const { leadId } = req.params;
    const { tagIds } = req.body;

    try {
        const inserts = tagIds.map(tagId => ({ lead_id: leadId, tag_id: tagId }));
        await supabase.from('lead_tags').insert(inserts);
        res.json({ message: 'Tags added to lead' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// WEEK 3-4 ENDPOINTS
// ============================================

/**
 * AUTO-TAG LEAD (BUS-90)
 * Generate and assign AI-suggested tags
 */
app.post('/api/leads/:leadId/auto-tag', strictLimiter, asyncHandler(async (req, res) => {
    const { leadId } = req.params;
    
    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    
    const suggestedTags = await generateAutoTags(lead);
    
    // Create tags if they don't exist and assign to lead
    for (const tagName of suggestedTags) {
        let { data: existingTag } = await supabase
            .from('tags')
            .select('id')
            .eq('user_id', lead.user_id)
            .eq('name', tagName)
            .single();
        
        if (!existingTag) {
            const { data: newTag } = await supabase
                .from('tags')
                .insert([{ user_id: lead.user_id, name: tagName, color: '#6366f1' }])
                .select()
                .single();
            existingTag = newTag;
        }
        
        if (existingTag) {
            await supabase.from('lead_tags').upsert([{ lead_id: leadId, tag_id: existingTag.id }]);
        }
    }
    
    res.json({ message: 'Auto-tagging complete', tags: suggestedTags });
}));

/**
 * HEALTH CHECK (BUS-108)
 * Detailed system health status
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        queue: getQueueStatus()
    });
});

/**
 * WEBHOOK CRUD (BUS-103)
 */
app.post('/api/webhooks', asyncHandler(async (req, res) => {
    const { userId, url, events, secret } = req.body;
    const webhook = webhookManager.register(userId, { url, events, secret });
    res.status(201).json({ webhook });
}));

app.get('/api/webhooks/:userId', (req, res) => {
    const webhooks = webhookManager.getByUser(req.params.userId);
    res.json(webhooks);
});

app.delete('/api/webhooks/:webhookId', (req, res) => {
    const deleted = webhookManager.unregister(req.params.webhookId);
    res.json({ success: deleted });
});

/**
 * QUEUE STATUS & CONTROL (BUS-84)
 */
app.get('/api/queue/status', (req, res) => {
    res.json(getQueueStatus());
});

app.post('/api/queue/enrich', asyncHandler(async (req, res) => {
    const { leadId, priority } = req.body;
    const job = addToQueue(leadId, priority);
    res.json({ message: 'Added to enrichment queue', job });
}));

/**
 * BATCH ENRICHMENT (BUS-100)
 */
app.post('/api/leads/batch-enrich', strictLimiter, asyncHandler(async (req, res) => {
    const { userId, leadIds, limit } = req.body;
    
    let result;
    if (leadIds && leadIds.length > 0) {
        result = await batchEnrichByIds(supabase, leadIds);
    } else if (userId) {
        result = await batchEnrichByUser(supabase, userId, { limit: limit || 50 });
    } else {
        return res.status(400).json({ error: 'userId or leadIds required' });
    }
    
    res.json(result);
}));

// Error handlers
app.use(notFoundHandler);
app.use(globalErrorHandler);

// --- SERVER START ---
// Start background scheduler
startScheduler(supabase, enrichWithWaterfall, calculateLeadScore);

app.listen(port, () => {
    logger.info(`🚀 LeadCatch Backend running on http://localhost:${port}`);
    console.log(`🚀 LeadCatch Backend running on http://localhost:${port}`);
    if (swaggerDocument) {
        console.log(`📚 API Docs available at http://localhost:${port}/api-docs`);
    }
});
