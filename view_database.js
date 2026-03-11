require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function viewAllData() {
    console.log("📊 VIEWING ALL DATA IN SUPABASE\n");
    console.log("=".repeat(60));

    // Get all leads (using service role key bypasses RLS)
    const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('lead_score', { ascending: false });

    if (leadsError) {
        console.error("Error fetching leads:", leadsError);
        return;
    }

    console.log(`\n👥 LEADS (${leads.length} total)\n`);
    console.log("-".repeat(60));

    leads.forEach((lead, i) => {
        console.log(`${i + 1}. ${lead.first_name} ${lead.last_name}`);
        console.log(`   Company: ${lead.company || 'N/A'}`);
        console.log(`   Email: ${lead.email || 'N/A'}`);
        console.log(`   Score: ${lead.lead_score}/100`);
        console.log(`   Status: ${lead.status}`);
        console.log(`   User ID: ${lead.user_id}`);
        console.log("");
    });

    // Get all tags
    const { data: tags } = await supabase.from('tags').select('*');
    console.log(`\n🏷️ TAGS (${tags.length} total)\n`);
    console.log("-".repeat(60));
    tags.forEach(tag => {
        console.log(`- ${tag.name} (${tag.color})`);
    });

    // Get all notes
    const { data: notes } = await supabase.from('notes').select('*');
    console.log(`\n📝 NOTES (${notes.length} total)\n`);
    console.log("-".repeat(60));
    notes.forEach((note, i) => {
        console.log(`${i + 1}. ${note.content.substring(0, 50)}...`);
    });

    // Get tag assignments
    const { data: assignments } = await supabase.from('lead_tags').select('*');
    console.log(`\n🔗 TAG ASSIGNMENTS (${assignments.length} total)\n`);

    console.log("\n" + "=".repeat(60));
    console.log("\n✅ All data retrieved successfully!");
    console.log("\n💡 If you don't see this in Supabase dashboard:");
    console.log("   1. Row Level Security (RLS) is blocking the view");
    console.log("   2. Go to Database → leads table → Toggle RLS off temporarily");
    console.log("   3. Turn RLS back ON after viewing for security\n");
}

viewAllData();
