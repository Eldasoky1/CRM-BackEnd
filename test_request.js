require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with Service Role Key for Admin access
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function main() {
    console.log("🔍 Finding a valid user...");

    // 1. Try to get an existing user
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    let userId;

    if (users && users.length > 0) {
        userId = users[0].id;
        console.log(`✅ Found existing user: ${userId}`);
    } else {
        console.log("⚠️ No users found. Creating a test user...");
        const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
            email: 'test_api_user@example.com',
            password: 'password123',
            email_confirm: true
        });

        if (createError) {
            console.error("❌ Failed to create user:", createError.message);
            process.exit(1);
        }
        userId = user.id;
        console.log(`✅ Created test user: ${userId}`);

        // Ensure profile exists
        await supabase.from('profiles').upsert({ id: userId, full_name: 'Test API User' });
    }

    // 2. Send Request to Local Server
    console.log("\n🚀 Sending POST request to http://localhost:5000/api/scrape ...");

    const payload = {
        userId: userId,
        targetUrl: 'https://www.linkedin.com/in/test-profile/',
        platform: 'linkedin'
    };

    try {
        const response = await fetch('http://localhost:5000/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("\n--- SERVER RESPONSE ---");
        console.log(`Status: ${response.status}`);
        console.log(JSON.stringify(data, null, 2));

    } catch (err) {
        console.error("❌ Request failed. Is the server running?");
        console.error(err);
    }
}

main();
