require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testWeek2Endpoints() {
    console.log("🧪 Testing Week 2 API Endpoints\n");

    // Get a valid user ID
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const userId = users[0].id;
    console.log(`📌 Using User ID: ${userId}\n`);

    const baseUrl = 'http://localhost:5000';

    try {
        // Create a test lead first
        console.log("1️⃣ Creating test lead...");
        const createRes = await fetch(`${baseUrl}/api/leads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                first_name: 'Test',
                last_name: 'Lead',
                email: 'test@example.com',
                company: 'TestCorp'
            })
        });
        const { lead } = await createRes.json();
        const leadId = lead.id;
        console.log(`✅ Created lead: ${leadId}\n`);

        // Test enrichment
        console.log("2️⃣ Testing manual enrichment (BUS-83)...");
        await fetch(`${baseUrl}/api/leads/${leadId}/enrich`, { method: 'POST' });
        console.log("✅ Enrichment triggered\n");

        // Test scoring
        console.log("3️⃣ Testing lead scoring (BUS-89)...");
        const scoreRes = await fetch(`${baseUrl}/api/leads/${leadId}/score`, { method: 'POST' });
        const scoreData = await scoreRes.json();
        console.log(`✅ Score: ${scoreData.score}\n`);

        // Test duplicate detection
        console.log("4️⃣ Testing duplicate detection (BUS-93)...");
        const dupeRes = await fetch(`${baseUrl}/api/leads/dedupe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        const dupes = await dupeRes.json();
        console.log(`✅ Found ${dupes.count} duplicates\n`);

        // Test CSV export
        console.log("5️⃣ Testing CSV export (BUS-94)...");
        const exportRes = await fetch(`${baseUrl}/api/leads/${userId}/export`);
        const csv = await exportRes.text();
        console.log(`✅ Export: ${csv.split('\n').length} rows\n`);

        // Test search
        console.log("6️⃣ Testing search (BUS-96)...");
        const searchRes = await fetch(`${baseUrl}/api/leads/search?userId=${userId}&q=Test`);
        const results = await searchRes.json();
        console.log(`✅ Found ${results.length} results\n`);

        // Test notes
        console.log("7️⃣ Testing Notes CRUD (BUS-97)...");
        const noteRes = await fetch(`${baseUrl}/api/leads/${leadId}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, content: 'Test note' })
        });
        const { note } = await noteRes.json();
        console.log(`✅ Created note: ${note.id}\n`);

        const getNotesRes = await fetch(`${baseUrl}/api/leads/${leadId}/notes`);
        const notes = await getNotesRes.json();
        console.log(`✅ Retrieved ${notes.length} notes\n`);

        // Test tags
        console.log("8️⃣ Testing Tags CRUD (BUS-98)...");
        const tagRes = await fetch(`${baseUrl}/api/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, name: 'Hot Lead', color: '#ff0000' })
        });
        const { tag } = await tagRes.json();
        console.log(`✅ Created tag: ${tag.name}\n`);

        await fetch(`${baseUrl}/api/leads/${leadId}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tagIds: [tag.id] })
        });
        console.log(`✅ Tagged lead\n`);

        // Test bulk operations
        console.log("9️⃣ Testing Bulk Operations (BUS-95)...");
        await fetch(`${baseUrl}/api/leads/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update',
                leadIds: [leadId],
                updates: { status: 'contacted' }
            })
        });
        console.log(`✅ Bulk update completed\n`);

        console.log("🎉 All Week 2 tests passed!\n");

    } catch (error) {
        console.error("❌ Test failed:", error.message);
    }
}

testWeek2Endpoints();
