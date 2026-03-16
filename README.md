# AI-Powered CRM Pipeline & Lead Enrichment Backend

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Puppeteer](https://img.shields.io/badge/Puppeteer-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI_GPT--4o-412991?style=for-the-badge&logo=openai&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

An automated, intelligent backend system that seamlessly integrates web scraping with Large Language Models (LLMs) for high-performance lead generation and enrichment. This microservice architecture reliably extracts raw data from web profiles, utilizes GPT-4o to parse and structure the unstructured data, and safely stores the enriched results in a highly scalable PostgreSQL database.

## 🚀 Key Features and Achievements

### 🧠 Intelligent Data Extraction
Engineered an automated web-scraping microservice utilizing **Puppeteer** and headless Chrome. Safely navigates target profiles, bypasses blocking mechanisms, and seamlessly extracts raw HTML text and metadata for downstream AI processing.

### 🤖 LLM Integration (GPT-4o)
Replaced rigid, regex-based data-parsing logic with advanced **OpenAI GPT-4o** integration. Programmed the AI to:
- Ingest unstructured scraped data and transform it into strictly structured JSON (Names, Roles, Emails, etc.).
- Generate detailed, personalized lead summaries for quick review.
- Calculate and assign a precise predictive 1-100 **Lead Quality Score**.

### 🔐 Secure Database Architecture
Designed and deployed a highly scalable and resilient **Supabase (PostgreSQL)** database schema. Fully configured with robust **Row Level Security (RLS)** to systematically manage asynchronous scraping jobs and securely partition/store enriched multi-tenant user data.

### ⚙️ Robust API Design & End-to-End Testing
Architected and developed a solid **Express.js REST API**. Equipped with rigorous, structured error handling and asynchronous request flows. Thoroughly backed by comprehensive end-to-end (E2E) testing suites (via Jest/Supertest) covering database operations, API edge-cases, and live AI scraping sessions.

## 💻 Tech Stack

- **Backend Framework:** Node.js, Express.js
- **Browser Automation & Scraping:** Puppeteer
- **AI / Machine Learning:** OpenAI API (GPT-4o)
- **Database / BaaS:** Supabase, PostgreSQL
- **Testing:** Jest, Supertest
- **Architecture:** Microservices, REST API

---
*Developed by Ahmed El-Dasouky*
