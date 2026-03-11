/**
 * Webhook System for Lead Events (BUS-103)
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class WebhookManager extends EventEmitter {
    constructor() {
        super();
        this.webhooks = new Map(); // In-memory storage (use DB in production)
        this.setupEventListeners();
    }
    
    /**
     * Register a new webhook
     */
    register(userId, config) {
        const webhook = {
            id: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            url: config.url,
            events: config.events || ['lead.created', 'lead.updated', 'lead.enriched'],
            secret: config.secret || this.generateSecret(),
            active: true,
            createdAt: new Date().toISOString()
        };
        
        this.webhooks.set(webhook.id, webhook);
        console.log(`🔗 Webhook registered: ${webhook.id} for events: ${webhook.events.join(', ')}`);
        
        return webhook;
    }
    
    /**
     * Remove a webhook
     */
    unregister(webhookId) {
        const deleted = this.webhooks.delete(webhookId);
        if (deleted) {
            console.log(`🗑️ Webhook unregistered: ${webhookId}`);
        }
        return deleted;
    }
    
    /**
     * Get webhooks for a user
     */
    getByUser(userId) {
        return Array.from(this.webhooks.values()).filter(w => w.userId === userId);
    }
    
    /**
     * Get all webhooks
     */
    getAll() {
        return Array.from(this.webhooks.values());
    }
    
    /**
     * Send webhook payload to registered endpoints
     */
    async sendWebhook(event, payload) {
        const relevantWebhooks = Array.from(this.webhooks.values())
            .filter(w => w.active && w.events.includes(event));
        
        if (relevantWebhooks.length === 0) {
            return [];
        }
        
        console.log(`📤 Sending ${event} webhook to ${relevantWebhooks.length} endpoints`);
        
        const results = await Promise.allSettled(
            relevantWebhooks.map(webhook => this.deliverPayload(webhook, event, payload))
        );
        
        return results.map((result, i) => ({
            webhookId: relevantWebhooks[i].id,
            success: result.status === 'fulfilled',
            error: result.reason?.message
        }));
    }
    
    /**
     * Deliver payload to a single webhook with retry
     */
    async deliverPayload(webhook, event, payload) {
        const body = {
            event,
            timestamp: new Date().toISOString(),
            data: payload
        };
        
        const signature = this.generateSignature(body, webhook.secret);
        
        const maxRetries = 3;
        let lastError;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const response = await fetch(webhook.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Webhook-Signature': signature,
                        'X-Webhook-Event': event
                    },
                    body: JSON.stringify(body)
                });
                
                if (!response.ok) {
                    throw new Error(`Webhook delivery failed: ${response.status}`);
                }
                
                console.log(`✅ Webhook delivered: ${webhook.id} -> ${event}`);
                return { success: true };
            } catch (error) {
                lastError = error;
                const delay = 2000 * Math.pow(2, attempt);
                console.warn(`⚠️ Webhook attempt ${attempt + 1} failed, retrying in ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        console.error(`❌ Webhook delivery failed after ${maxRetries} attempts: ${webhook.id}`);
        throw lastError;
    }
    
    /**
     * Setup event listeners for lead events
     */
    setupEventListeners() {
        this.on('lead.created', (lead) => this.sendWebhook('lead.created', lead));
        this.on('lead.updated', (lead) => this.sendWebhook('lead.updated', lead));
        this.on('lead.enriched', (lead) => this.sendWebhook('lead.enriched', lead));
        this.on('lead.deleted', (leadId) => this.sendWebhook('lead.deleted', { id: leadId }));
        this.on('lead.scored', (data) => this.sendWebhook('lead.scored', data));
    }
    
    /**
     * Generate webhook secret
     */
    generateSecret() {
        return 'whsec_' + crypto.randomBytes(24).toString('hex');
    }
    
    /**
     * Generate HMAC signature for payload
     */
    generateSignature(payload, secret) {
        return crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');
    }
}

// Singleton instance
const webhookManager = new WebhookManager();

module.exports = { webhookManager };
