require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function checkModels() {
    console.log("📋 Checking available OpenAI models...\n");

    try {
        const models = await openai.models.list();

        console.log("Available GPT models:");
        models.data
            .filter(m => m.id.includes('gpt'))
            .forEach(model => {
                console.log(`  - ${model.id}`);
            });

    } catch (error) {
        console.error("Error:", error.message);
    }
}

checkModels();
