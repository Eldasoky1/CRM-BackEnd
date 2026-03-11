const puppeteer = require('puppeteer');

/**
 * Scrapes a LinkedIn profile or any URL using Puppeteer.
 * @param {string} url - The URL to scrape
 * @returns {Object} - Raw text and metadata
 */
async function scrapeProfile(url) {
    console.log(`🕷️ Launching Scraper for: ${url}`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Set a realistic User Agent to avoid immediate blocking
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

        await page.setViewport({ width: 1280, height: 800 });

        // Navigate to URL
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Basic wait to let dynamic content load
        // LinkedIn often redirects to auth wall, so we try to get what we can quickly
        await new Promise(r => setTimeout(r, 2000));

        // Extract Data
        const data = await page.evaluate(() => {
            // Helper to clean text
            const clean = (text) => text ? text.replace(/\s+/g, ' ').trim() : '';

            return {
                title: document.title,
                meta_description: document.querySelector('meta[name="description"]')?.content || '',
                h1: clean(document.querySelector('h1')?.innerText),
                // Get main body text, truncated
                body_text: clean(document.body.innerText).substring(0, 3000)
            };
        });

        console.log(`✅ Scraped ${data.title}`);
        return data;

    } catch (error) {
        console.error("Scraping Error:", error);
        throw new Error(`Failed to scrape ${url}: ${error.message}`);
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { scrapeProfile };
