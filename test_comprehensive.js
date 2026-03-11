require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function comprehensiveTest() {
    console.log("🧪 COMPREHENSIVE TEST: Week 1 + Week 2\n");
    console.log("=".repeat(60));

    // Get user
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const userId = users[0].id;
    console.log(`📌 User ID: ${userId}\n`);

    const baseUrl = 'http://localhost:5000';
    let testsPassed = 0;
    let testsFailed = 0;

    // Helper function
    const test = async (name, fn) => {
        try {
            console.log(`${testsPassed + testsFailed + 1}. ${name}`);
            await fn();
            console.log(`   ✅ PASS\n`);
            testsPassed++;
        } catch (error) {
            console.log(`   ❌ FAIL: ${error.message}\n`);
            testsFailed++;
        }
    };

    console.log("📦 WEEK 1 FEATURES\n");
    console.log("-".repeat(60));

    // Week 1: Basic CRUD
    let testLeadId;
    await test("Create Lead Manually (BUS-49)", async () => {
        const res = await fetch(`${baseUrl}/api/leads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                first_name: 'Ahmed',
                last_name: 'Test',
                email: 'ahmed.test@example.com',
                company: 'Google',
                job_title: 'CEO'
            })
        });
        const data = await res.json();
        if (!data.lead) throw new Error('No lead created');
        testLeadId = data.lead.id;
    });

    await test("Get All Leads (BUS-52)", async () => {
        const res = await fetch(`${baseUrl}/api/leads/${userId}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Not an array');
    });

    await test("Get Single Lead (BUS-53)", async () => {
        const res = await fetch(`${baseUrl}/api/leads/${userId}/${testLeadId}`);
        const data = await res.json();
        if (!data.id) throw new Error('Lead not found');
    });

    await test("Update Lead (BUS-54)", async () => {
        const res = await fetch(`${baseUrl}/api/leads/${testLeadId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'contacted', lead_score: 95 })
        });
        const data = await res.json();
        if (data.lead.status !== 'contacted') throw new Error('Not updated');
    });

    await test("AI Text Parsing (BUS-50)", async () => {
        const res = await fetch(`${baseUrl}/api/leads/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                text: 'Jane Smith, VP Sales at Microsoft, jane@microsoft.com'
            })
        });
        const data = await res.json();
        if (!data.lead) throw new Error('Lead not created from text');
    });

    await test("CSV Import (BUS-51)", async () => {
        const res = await fetch(`${baseUrl}/api/leads/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                leads: [
                    { firstName: 'Bob', lastName: 'Williams', email: 'bob@test.com' },
                    { firstName: 'Alice', lastName: 'Johnson', company: 'Apple' }
                ]
            })
        });
        const data = await res.json();
        if (!data.leads || data.leads.length !== 2) throw new Error('Import failed');
    });

    console.log("\n📦 WEEK 2 FEATURES\n");
    console.log("-".repeat(60));

    await test("Manual Enrichment (BUS-83)", async () => {
        const res = await fetch(`${baseUrl}/api/leads/${testLeadId}/enrich`, {
            method: 'POST'
        });
        const data = await res.json();
        if (!data.lead) throw new Error('Enrichment failed');
    });

    await test("Calculate Lead Score (BUS-89)", async () => {
        const res = await fetch(`${baseUrl}/api/leads/${testLeadId}/score`, {
            method: 'POST'
        });
        const data = await res.json();
        if (typeof data.score !== 'number') throw new Error('Score not calculated');
    });

    await test("Find Duplicates (BUS-93)", async () => {
        const res = await fetch(`${baseUrl}/api/leads/dedupe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        const data = await res.json();
        if (!Array.isArray(data.duplicates)) throw new Error('Duplicates check failed');
    });

    await test("Export to CSV (BUS-94)", async () => {
        const res = await fetch(`${baseUrl}/api/leads/${userId}/export`);
        const csv = await res.text();
        if (!csv || csv.length < 10) throw new Error('CSV export failed');
    });

    await test("Bulk Update (BUS-95)", async () => {
        const res = await fetch(`${baseUrl}/api/leads/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update',
                leadIds: [testLeadId],
                updates: { status: 'interested' }
            })
        });
        const data = await res.json();
        if (!data.message) throw new Error('Bulk update failed');
    });

    await test("Search Leads (BUS-96)", async () => {
        const res = await fetch(`${baseUrl}/api/leads/search?userId=${userId}&q=Ahmed`);
        const data = await res.json();
        if (data === null || data === undefined) throw new Error('Search failed');
    });

    // Notes CRUD
    let noteId;
    await test("Create Note (BUS-97)", async () => {
        const res = await fetch(`${baseUrl}/api/leads/${testLeadId}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, content: 'Test note for verification' })
        });
        const data = await res.json();
        if (!data.note) throw new Error('Note not created');
        noteId = data.note.id;
    });

    await test("Get Notes (BUS-97)", async () => {
        const res = await fetch(`${baseUrl}/api/leads/${testLeadId}/notes`);
        const data = await res.json();
        if (data === null || data === undefined) throw new Error('Notes not retrieved');
    });

    await test("Delete Note (BUS-97)", async () => {
        const res = await fetch(`${baseUrl}/api/notes/${noteId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.message) throw new Error('Note not deleted');
    });

    // Tags CRUD
    let tagId;
    await test("Create Tag (BUS-98)", async () => {
        const res = await fetch(`${baseUrl}/api/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, name: `VIP-${Date.now()}`, color: '#FFD700' })
        });
        const data = await res.json();
        if (!data.tag) throw new Error('Tag not created');
        tagId = data.tag.id;
    });

    await test("Get Tags (BUS-98)", async () => {
        const res = await fetch(`${baseUrl}/api/tags/${userId}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Tags not retrieved');
    });

    await test("Assign Tag to Lead (BUS-98)", async () => {
        const res = await fetch(`${baseUrl}/api/leads/${testLeadId}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tagIds: [tagId] })
        });
        const data = await res.json();
        if (!data.message) throw new Error('Tag not assigned');
    });

    // Cleanup test - delete the test lead
    await test("Delete Lead (BUS-55)", async () => {
        const res = await fetch(`${baseUrl}/api/leads/${testLeadId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.message) throw new Error('Lead not deleted');
    });

    // Summary
    console.log("=".repeat(60));
    console.log("\n📊 TEST RESULTS\n");
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%\n`);

    if (testsFailed === 0) {
        console.log("🎉 ALL TESTS PASSED! Week 1 + Week 2 fully functional!\n");
    } else {
        console.log("⚠️ Some tests failed. Check the errors above.\n");
    }
}

comprehensiveTest().catch(console.error);
