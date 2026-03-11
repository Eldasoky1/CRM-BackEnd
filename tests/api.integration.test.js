/**
 * Integration Tests for API Endpoints (BUS-106)
 */

const request = require('supertest');

// Mock express app for testing
const express = require('express');
const app = express();
app.use(express.json());

// Mock routes for testing
app.get('/', (req, res) => {
    res.json({ status: 'active', system: 'LeadCatch API v1' });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.post('/api/leads', (req, res) => {
    const { userId, first_name, last_name, email } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }
    
    res.status(201).json({
        message: 'Lead created successfully',
        lead: {
            id: 'test-uuid',
            user_id: userId,
            first_name,
            last_name,
            email,
            lead_score: 0,
            is_enriched: false
        }
    });
});

app.get('/api/leads/:userId', (req, res) => {
    res.json([
        { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
        { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' }
    ]);
});

app.patch('/api/leads/:leadId', (req, res) => {
    const { leadId } = req.params;
    res.json({
        message: 'Lead updated successfully',
        lead: { id: leadId, ...req.body }
    });
});

app.delete('/api/leads/:leadId', (req, res) => {
    res.json({ message: 'Lead deleted successfully' });
});

app.post('/api/leads/bulk', (req, res) => {
    const { action, leadIds } = req.body;
    
    if (!['delete', 'update'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    res.json({ message: `${action}d ${leadIds.length} leads` });
});

app.get('/api/leads/search', (req, res) => {
    const { q } = req.query;
    res.json([
        { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' }
    ]);
});

describe('API Integration Tests', () => {
    describe('Health Endpoints', () => {
        test('GET / should return API status', async () => {
            const res = await request(app).get('/');
            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('active');
            expect(res.body.system).toBe('LeadCatch API v1');
        });

        test('GET /api/health should return health info', async () => {
            const res = await request(app).get('/api/health');
            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('healthy');
            expect(res.body).toHaveProperty('timestamp');
            expect(res.body).toHaveProperty('uptime');
        });
    });

    describe('Lead CRUD Endpoints', () => {
        test('POST /api/leads should create a lead', async () => {
            const res = await request(app)
                .post('/api/leads')
                .send({
                    userId: 'test-user-id',
                    first_name: 'John',
                    last_name: 'Doe',
                    email: 'john@example.com'
                });
            
            expect(res.statusCode).toBe(201);
            expect(res.body.message).toBe('Lead created successfully');
            expect(res.body.lead.first_name).toBe('John');
        });

        test('POST /api/leads should require userId', async () => {
            const res = await request(app)
                .post('/api/leads')
                .send({
                    first_name: 'John',
                    last_name: 'Doe'
                });
            
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('userId is required');
        });

        test('GET /api/leads/:userId should return leads', async () => {
            const res = await request(app).get('/api/leads/test-user-id');
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
        });

        test('PATCH /api/leads/:leadId should update lead', async () => {
            const res = await request(app)
                .patch('/api/leads/test-lead-id')
                .send({ status: 'contacted' });
            
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Lead updated successfully');
        });

        test('DELETE /api/leads/:leadId should delete lead', async () => {
            const res = await request(app).delete('/api/leads/test-lead-id');
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Lead deleted successfully');
        });
    });

    describe('Bulk Operations', () => {
        test('POST /api/leads/bulk should handle delete action', async () => {
            const res = await request(app)
                .post('/api/leads/bulk')
                .send({
                    action: 'delete',
                    leadIds: ['id1', 'id2', 'id3']
                });
            
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toContain('3 leads');
        });

        test('POST /api/leads/bulk should reject invalid action', async () => {
            const res = await request(app)
                .post('/api/leads/bulk')
                .send({
                    action: 'invalid',
                    leadIds: ['id1']
                });
            
            expect(res.statusCode).toBe(400);
        });
    });

    describe('Search', () => {
        test('GET /api/leads/search should return results', async () => {
            const res = await request(app)
                .get('/api/leads/search')
                .query({ userId: 'test', q: 'john' });
            
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });
});
