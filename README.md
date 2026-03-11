# CRM-BackEnd

A **Customer Relationship Management (CRM) backend** built with AI-powered features using the OpenAI API. This service provides RESTful API endpoints for managing customers, interactions, and business data, enhanced with intelligent automation and natural-language processing capabilities.

---

## 🚀 Features

- **Customer Management** – Create, read, update, and delete customer records.
- **AI-Powered Insights** – Leverage the OpenAI API to generate summaries, draft responses, and surface actionable insights from customer data.
- **Interaction Tracking** – Log calls, emails, and meetings tied to individual customer profiles.
- **Authentication & Authorization** – Secure endpoints with token-based authentication.
- **RESTful API** – Clean, well-structured API consumed by front-end clients or third-party integrations.

---

## 🏗️ Project Structure

```
CRM-BackEnd/
├── src/
│   ├── config/           # Application configuration (database, environment variables, OpenAI client setup)
│   ├── controllers/      # Route handler functions — orchestrate requests and responses
│   │   ├── customerController.js   # CRUD operations for customer records
│   │   ├── interactionController.js# Log and retrieve customer interactions
│   │   └── aiController.js         # Endpoints that call the OpenAI API for AI features
│   ├── middleware/       # Express middleware (auth, error handling, request validation)
│   │   ├── auth.js                 # JWT / API-key authentication guard
│   │   └── errorHandler.js        # Centralised error-response formatting
│   ├── models/           # Database schema definitions (e.g. Mongoose / Sequelize models)
│   │   ├── Customer.js             # Customer entity schema
│   │   └── Interaction.js          # Interaction entity schema
│   ├── routes/           # Express router definitions — map HTTP methods + paths to controllers
│   │   ├── customerRoutes.js       # /api/customers  routes
│   │   ├── interactionRoutes.js    # /api/interactions routes
│   │   └── aiRoutes.js             # /api/ai routes
│   ├── services/         # Business logic layer, external integrations
│   │   ├── openaiService.js        # Wrapper around the OpenAI SDK (chat completions, embeddings, etc.)
│   │   └── customerService.js      # Business rules for customer operations
│   └── app.js            # Express application setup (middleware registration, route mounting)
├── tests/                # Automated test suites (unit & integration)
├── .env.example          # Template for required environment variables
├── package.json          # Node.js project manifest and npm scripts
└── README.md             # Project documentation (this file)
```

---

## ⚙️ Getting Started

### Prerequisites

| Tool | Minimum version |
|------|----------------|
| Node.js | 18.x |
| npm | 9.x |
| MongoDB (or your chosen DB) | 6.x |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Eldasoky1/CRM-BackEnd.git
cd CRM-BackEnd

# 2. Install dependencies
npm install

# 3. Copy the environment variable template and fill in your values
cp .env.example .env
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Port the HTTP server will listen on (default: `3000`) |
| `DATABASE_URL` | Connection string for your database |
| `JWT_SECRET` | Secret key used to sign and verify JWT tokens |
| `OPENAI_API_KEY` | Your OpenAI API key (obtain from [platform.openai.com](https://platform.openai.com)) |
| `OPENAI_MODEL` | OpenAI model to use, e.g. `gpt-4o` |

### Running the Server

```bash
# Development (with hot-reload)
npm run dev

# Production
npm start
```

---

## 📡 API Endpoints

### Customers

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/customers` | List all customers |
| `POST` | `/api/customers` | Create a new customer |
| `GET` | `/api/customers/:id` | Get a single customer by ID |
| `PUT` | `/api/customers/:id` | Update a customer |
| `DELETE` | `/api/customers/:id` | Delete a customer |

### Interactions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/interactions` | List all interactions |
| `POST` | `/api/interactions` | Log a new interaction |
| `GET` | `/api/interactions/:id` | Get a single interaction |

### AI Features

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ai/summarize` | Summarize a customer's interaction history |
| `POST` | `/api/ai/draft-reply` | Draft a personalised email reply for a customer |

---

## 🤖 OpenAI Integration

The `src/services/openaiService.js` module initialises the OpenAI client using the `OPENAI_API_KEY` environment variable and exposes helper functions for:

- **Chat completions** – Send a conversation thread and receive a generated response.
- **Embeddings** – Convert customer notes to vector embeddings for semantic search.

All calls are centralised in the service layer to make it easy to swap models or add retry logic.

---

## 🧪 Testing

```bash
npm test
```

Tests are located in the `tests/` directory and cover unit tests for services and integration tests for API routes.

---

## 📄 License

This project is licensed under the **MIT License**.
