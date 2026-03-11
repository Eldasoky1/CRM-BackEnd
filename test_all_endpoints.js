require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testAllEndpoints() {
    console.log("🧪 Testing All CRM API Endpoints\n");

    // Get a valid user ID
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const userId = users[0].id;
    console.log(`📌 Using User ID: ${userId}\n`);

    const baseUrl = 'http://localhost:5000';

    // ===== TEST 1: Create Lead Manually (BUS-49) =====
    console.log("1️⃣ Testing POST /api/leads (Create Lead Manually)");
    const createResponse = await fetch(`${baseUrl}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId,
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane.smith@example.com',
            job_title: 'Product Manager',
            company: 'Tech Innovations Inc',
            location: 'San Francisco, CA'
        })
    });
    const newLead = await createResponse.json();
    console.log(`✅ ${newLead.message}`);
    const leadId = newLead.lead.id;
    console.log(`   Lead ID: ${leadId}\n`);

    // ===== TEST 2: Get All Leads (BUS-52) =====
    console.log("2️⃣ Testing GET /api/leads/:userId (Get All Leads)");
    const getAllResponse = await fetch(`${baseUrl}/api/leads/${userId}`);
    const allLeads = await getAllResponse.json();
    console.log(`✅ Found ${allLeads.length} leads\n`);

    // ===== TEST 3: Get Single Lead (BUS-53) =====
    console.log("3️⃣ Testing GET /api/leads/:userId/:leadId (Get Single Lead)");
    const getSingleResponse = await fetch(`${baseUrl}/api/leads/${userId}/${leadId}`);
    const singleLead = await getSingleResponse.json();
    console.log(`✅ Retrieved: ${singleLead.first_name} ${singleLead.last_name}\n`);

    // ===== TEST 4: Update Lead (BUS-54) =====
    console.log("4️⃣ Testing PATCH /api/leads/:leadId (Update Lead)");
    const updateResponse = await fetch(`${baseUrl}/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status: 'contacted',
            lead_score: 75
        })
    });
    const updated = await updateResponse.json();
    console.log(`✅ ${updated.message}`);
    console.log(`   New Status: ${updated.lead.status}, Score: ${updated.lead.lead_score}\n`);

    // ===== TEST 5: AI Parse Text (BUS-50) =====
    console.log("5️⃣ Testing POST /api/leads/parse (AI Parse Text)");
    const parseResponse = await fetch(`${baseUrl}/api/leads/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId,
            text: `
                John Doe
                Senior Software Engineer at Google
                john.doe@google.com
                Mountain View, California
                Phone: +1-555-0123
            `
        })
    });
    const parsed = await parseResponse.json();
    console.log(`✅ ${parsed.message}`);
    console.log(`   Parsed: ${parsed.lead.first_name} ${parsed.lead.last_name} @ ${parsed.lead.company}\n`);

    // ===== TEST 6: CSV Import (BUS-51) =====
    console.log("6️⃣ Testing POST /api/leads/import (CSV Import)");
    const importResponse = await fetch(`${baseUrl}/api/leads/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId,
            leads: [
                { firstName: 'Alice', lastName: 'Johnson', email: 'alice@example.com', company: 'StartupXYZ' },
                { firstName: 'Bob', lastName: 'Williams', email: 'bob@example.com', company: 'Enterprise Corp' }
            ]
        })
    });
    const imported = await importResponse.json();
    console.log(`✅ ${imported.message}\n`);

    // ===== TEST 7: Get Leads with Filters (BUS-52 Enhanced) =====
    console.log("7️⃣ Testing GET /api/leads with filters");
    const filterResponse = await fetch(`${baseUrl}/api/leads/${userId}?status=contacted&minScore=50`);
    const filtered = await filterResponse.json();
    console.log(`✅ Found ${filtered.length} leads matching filters\n`);

    // ===== TEST 8: Delete Lead (BUS-55) =====
    console.log("8️⃣ Testing DELETE /api/leads/:leadId (Delete Lead)");
    const deleteResponse = await fetch(`${baseUrl}/api/leads/${leadId}`, {
        method: 'DELETE'
    });
    const deleted = await deleteResponse.json();
    console.log(`✅ ${deleted.message}\n`);

    console.log("🎉 All tests completed!");
}

testAllEndpoints().catch(console.error);
