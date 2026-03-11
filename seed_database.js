require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function seedDatabase() {
    console.log("🌱 SEEDING DATABASE WITH WEEK 1 & 2 DEMO DATA\n");
    console.log("=".repeat(60));

    const baseUrl = 'http://localhost:5000';

    // Get user
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const userId = users[0].id;
    console.log(`📌 User ID: ${userId}\n`);

    const createdLeads = [];
    const createdTags = [];

    // ========== WEEK 1 FEATURES ==========
    console.log("📦 WEEK 1: Creating Sample Leads\n");

    // 1. Create leads manually (BUS-49)
    const sampleLeads = [
        {
            first_name: 'Elon',
            last_name: 'Musk',
            email: 'elon@tesla.com',
            phone: '+1-650-681-5000',
            job_title: 'CEO',
            company: 'Tesla',
            location: 'Austin, Texas',
            linkedin_url: 'https://linkedin.com/in/elonmusk'
        },
        {
            first_name: 'Satya',
            last_name: 'Nadella',
            email: 'satya@microsoft.com',
            job_title: 'CEO',
            company: 'Microsoft',
            location: 'Redmond, Washington'
        },
        {
            first_name: 'Sundar',
            last_name: 'Pichai',
            email: 'sundar@google.com',
            job_title: 'CEO',
            company: 'Google',
            location: 'Mountain View, California'
        }
    ];

    for (const lead of sampleLeads) {
        const res = await fetch(`${baseUrl}/api/leads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, ...lead })
        });
        const data = await res.json();
        createdLeads.push(data.lead);
        console.log(`✅ Created: ${lead.first_name} ${lead.last_name} @ ${lead.company}`);
    }

    // 2. AI Text Parsing (BUS-50)
    console.log("\n📝 Testing AI Text Parsing...");
    const textToParse = `
        Jane Smith
        VP of Sales at Amazon
        jane.smith@amazon.com
        +1-206-266-1000
        Seattle, Washington
    `;

    const parseRes = await fetch(`${baseUrl}/api/leads/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, text: textToParse })
    });
    const parsedLead = await parseRes.json();
    createdLeads.push(parsedLead.lead);
    console.log(`✅ Parsed lead from text: ${parsedLead.lead.first_name} ${parsedLead.lead.last_name}`);

    // 3. CSV Import (BUS-51)
    console.log("\n📊 Testing CSV Import...");
    const csvLeads = [
        { firstName: 'Tim', lastName: 'Cook', email: 'tim@apple.com', company: 'Apple', jobTitle: 'CEO' },
        { firstName: 'Mark', lastName: 'Zuckerberg', email: 'mark@meta.com', company: 'Meta', jobTitle: 'CEO' },
        { firstName: 'Jensen', lastName: 'Huang', email: 'jensen@nvidia.com', company: 'NVIDIA', jobTitle: 'CEO' }
    ];

    const importRes = await fetch(`${baseUrl}/api/leads/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, leads: csvLeads })
    });
    const imported = await importRes.json();
    createdLeads.push(...imported.leads);
    console.log(`✅ Imported ${imported.leads.length} leads from CSV`);

    // ========== WEEK 2 FEATURES ==========
    console.log("\n📦 WEEK 2: Enhanced Features\n");

    // 4. Manual Enrichment (BUS-83)
    console.log("🤖 Enriching leads with AI...");
    for (let i = 0; i < 3; i++) {
        await fetch(`${baseUrl}/api/leads/${createdLeads[i].id}/enrich`, { method: 'POST' });
        console.log(`✅ Enriched: ${createdLeads[i].first_name} ${createdLeads[i].last_name}`);
    }

    // 5. Calculate Lead Scores (BUS-89)
    console.log("\n📊 Calculating lead scores...");
    for (const lead of createdLeads) {
        const scoreRes = await fetch(`${baseUrl}/api/leads/${lead.id}/score`, { method: 'POST' });
        const scored = await scoreRes.json();
        console.log(`✅ Score for ${lead.first_name} ${lead.last_name}: ${scored.score}/100`);
    }

    // 6. Create Tags (BUS-98)
    console.log("\n🏷️ Creating tags...");
    const tags = [
        { name: 'Hot Lead', color: '#ff0000' },
        { name: 'CEO', color: '#FFD700' },
        { name: 'Tech Industry', color: '#0066cc' },
        { name: 'Enterprise', color: '#9933ff' }
    ];

    for (const tag of tags) {
        const tagRes = await fetch(`${baseUrl}/api/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, ...tag })
        });
        const created = await tagRes.json();
        createdTags.push(created.tag);
        console.log(`✅ Created tag: ${tag.name}`);
    }

    // 7. Assign tags to leads
    console.log("\n🔖 Tagging leads...");
    for (let i = 0; i < createdLeads.length; i++) {
        const tagIdsToAssign = [createdTags[1].id, createdTags[2].id]; // CEO + Tech Industry
        await fetch(`${baseUrl}/api/leads/${createdLeads[i].id}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tagIds: tagIdsToAssign })
        });
        console.log(`✅ Tagged: ${createdLeads[i].first_name} ${createdLeads[i].last_name}`);
    }

    // 8. Create Notes (BUS-97)
    console.log("\n📝 Adding notes to leads...");
    const notes = [
        'Initial contact made - very interested',
        'Follow up scheduled for next week',
        'Requested product demo',
        'Decision maker confirmed'
    ];

    for (let i = 0; i < Math.min(4, createdLeads.length); i++) {
        await fetch(`${baseUrl}/api/leads/${createdLeads[i].id}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, content: notes[i] })
        });
        console.log(`✅ Note added to: ${createdLeads[i].first_name} ${createdLeads[i].last_name}`);
    }

    // 9. Update some leads (BUS-54)
    console.log("\n✏️ Updating lead statuses...");
    const statuses = ['contacted', 'interested', 'contacted', 'new'];
    for (let i = 0; i < Math.min(4, createdLeads.length); i++) {
        await fetch(`${baseUrl}/api/leads/${createdLeads[i].id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: statuses[i] })
        });
        console.log(`✅ Updated ${createdLeads[i].first_name} to status: ${statuses[i]}`);
    }

    // 10. Check for duplicates (BUS-93)
    console.log("\n🔍 Checking for duplicates...");
    const dupeRes = await fetch(`${baseUrl}/api/leads/dedupe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
    });
    const dupes = await dupeRes.json();
    console.log(`✅ Found ${dupes.count} potential duplicates`);

    // ========== DATABASE SUMMARY ==========
    console.log("\n" + "=".repeat(60));
    console.log("\n📊 DATABASE SUMMARY\n");

    const { data: allLeads } = await supabase.from('leads').select('*').eq('user_id', userId);
    const { data: allTags } = await supabase.from('tags').select('*').eq('user_id', userId);
    const { data: allNotes } = await supabase.from('notes').select('*').eq('user_id', userId);
    const { data: allTagAssignments } = await supabase.from('lead_tags').select('*');

    console.log(`📈 Total Leads: ${allLeads.length}`);
    console.log(`   - New: ${allLeads.filter(l => l.status === 'new').length}`);
    console.log(`   - Contacted: ${allLeads.filter(l => l.status === 'contacted').length}`);
    console.log(`   - Interested: ${allLeads.filter(l => l.status === 'interested').length}`);
    console.log(`   - Enriched: ${allLeads.filter(l => l.is_enriched).length}`);

    console.log(`\n🏷️ Total Tags: ${allTags.length}`);
    allTags.forEach(tag => console.log(`   - ${tag.name} (${tag.color})`));

    console.log(`\n📝 Total Notes: ${allNotes.length}`);
    console.log(`🔗 Total Tag Assignments: ${allTagAssignments.length}`);

    // Lead Score Distribution
    const scores = allLeads.map(l => l.lead_score || 0);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    console.log(`\n📊 Lead Score Stats:`);
    console.log(`   - Average: ${avgScore}/100`);
    console.log(`   - Highest: ${maxScore}/100`);
    console.log(`   - Lowest: ${minScore}/100`);

    // Top Leads
    console.log(`\n🌟 Top 3 Leads by Score:`);
    const topLeads = allLeads.sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0)).slice(0, 3);
    topLeads.forEach((lead, i) => {
        console.log(`   ${i + 1}. ${lead.first_name} ${lead.last_name} @ ${lead.company} - Score: ${lead.lead_score}/100`);
    });

    console.log("\n" + "=".repeat(60));
    console.log("\n✅ Database seeding complete!");
    console.log(`\n📍 Check your Supabase dashboard to see all the data!\n`);
}

seedDatabase().catch(console.error);
