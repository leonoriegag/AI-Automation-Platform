# Local Development & Contribution Guide

## 1. Prerequisites

Before setting up the project, ensure your environment has:
- **Node.js**: LTS version (v20+ or v25+)
- **Package Manager**: `pnpm` (v9+ or v10+)
- **Git**: v2.40+
- **Docker & Docker Compose**: v24+ for local PostgreSQL 16 container

---

## 2. Quickstart Setup

### Step 1: Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/leonoriegag/AI-Automation-Platform.git
cd AI-Automation-Platform

# Install monorepo dependencies
pnpm install
```

### Step 2: Environment Configuration
```bash
# Copy example environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Ensure `apps/api/.env` contains your database connection string and master encryption key:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nexora_automation?schema=public"
ENCRYPTION_MASTER_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
JWT_SECRET="super-secret-dev-jwt-token-replace-in-production"
LOG_LEVEL="info"
```

### Step 3: Start Infrastructure
```bash
# Spin up PostgreSQL container
docker compose up -d postgres
```

### Step 4: Run Migrations & Seed Data
```bash
# Apply Prisma migrations
pnpm db:migrate

# Seed baseline organizations, demo users, credentials, and demonstration workflows
pnpm db:seed
```

### Step 5: Start Development Servers
```bash
# Start backend API (http://localhost:4000) and frontend (http://localhost:5173) concurrently
pnpm dev
```

---

## 3. Seed Credentials & Demo Accounts

When the seed script completes, the following test accounts are ready for use:

| Email | Password | Role | Organization |
| :--- | :--- | :--- | :--- |
| `admin@nexora.io` | `Password123!` | Org Admin | NEXORA Operations |
| `editor@nexora.io` | `Password123!` | Workflow Editor | NEXORA Operations |
| `operator@nexora.io`| `Password123!` | Workflow Operator | NEXORA Operations |
| `approver@nexora.io`| `Password123!` | Approver | NEXORA Operations |
| `admin@competitor.io`| `Password123!`| Org Admin | Competitor Corp (Tenant Isolation Test) |

---

## 4. Testing Suite Execution

The repository is equipped with a tiered automated testing suite using **Vitest**:

```bash
# Run all unit tests (fast, isolated, no database required)
pnpm test:unit

# Run database & API integration tests (requires PostgreSQL)
pnpm test:integration

# Run security test suite (SSRF, RBAC, tenant isolation, encryption)
pnpm test:security

# Run end-to-end workflow execution tests
pnpm test:e2e

# Run all test suites
pnpm test
```

---

## 5. Code Quality & Formatting

```bash
# Run TypeScript compilation check across all packages and apps
pnpm typecheck

# Run linter
pnpm lint

# Format code with Prettier
pnpm format
```
