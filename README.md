# NEXORA Operations — Enterprise AI Workflow Automation Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.2+-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![React Flow](https://img.shields.io/badge/@xyflow/react-12.4+-FF4088)](https://reactflow.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6.3+-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Tests-118%2F118%20Passing-brightgreen?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Security](https://img.shields.io/badge/Security-Zero--Trust%20%7C%20SSRF%20Guard%20%7C%20AES--256--GCM-blueviolet)]()

**NEXORA Operations** is a production-grade, multi-tenant enterprise workflow automation and AI agent orchestration platform. Built with a deterministic DAG runtime, sandboxed autonomous agent loops, human-in-the-loop decision checkpoints, and a zero-trust security perimeter.

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph Client["Presentation & Ingestion Tier"]
        UI["React 18 Flow Canvas & Inspector<br/>(@xyflow/react)"]
        WH["Inbound Webhooks<br/>(HMAC-SHA256 Signed)"]
        SCH["pg-boss Scheduled Triggers<br/>(Durable Cron Engine)"]
    end

    subgraph API["Enterprise API Gateway (Fastify)"]
        AUTH["Auth & RBAC Middleware<br/>(JWT + Multi-Tenant Scoping)"]
        ROUTER["Workflow, Credential & Execution API"]
        SEC_LOGGER["Structured Audit Logger<br/>(Zero-Plaintext Redaction)"]
    end

    subgraph Core["Execution & Runtime Layer"]
        VALIDATOR["Kahn's DAG Validator<br/>(Cycle Detection & Topology)"]
        ENGINE["Deterministic DAG Engine<br/>(Active Edge Branching & Joins)"]
        AGENT_RUNTIME["Bounded AI Agent Runtime<br/>(Tool Whitelisting & Budgets)"]
        APPROV_SVC["Human Approval Engine<br/>(Durable Workflow Pausing)"]
    end

    subgraph Connectors["Enterprise Connectors & Guardrails"]
        SSRF["SSRF Defense Guard<br/>(Loopback, RFC 1918, Cloud Metadata)"]
        HTTP_CONN["HTTP / REST Client"]
        WH_CONN["Outbound Webhook Dispatcher"]
        EMAIL_CONN["Transactional Email Outbox"]
        SLACK_CONN["Slack Incident Bridge"]
        CRM_CONN["Enterprise CRM Connector"]
    end

    subgraph Persistence["Storage & Zero-Trust Secrets"]
        DB[("PostgreSQL 16 (Multi-Tenant)<br/>Workflows, Executions, Approvals")]
        ENCR["AES-256-GCM Envelope Encryption<br/>(Unique IVs & Zero Plaintext)"]
    end

    UI --> AUTH
    WH --> ROUTER
    SCH --> ROUTER
    AUTH --> ROUTER
    ROUTER --> SEC_LOGGER
    ROUTER --> VALIDATOR
    VALIDATOR --> ENGINE
    ENGINE --> AGENT_RUNTIME
    ENGINE --> APPROV_SVC
    ENGINE --> Connectors
    Connectors --> SSRF
    ROUTER --> DB
    ROUTER --> ENCR
```

---

## Core Pillars & Capabilities

### 1. Deterministic DAG Workflow Engine
- **Kahn's Algorithm Topology Validation**: Detects directed cycles, isolated orphaned nodes, and ensures single-entry reachability before any step executes.
- **Dynamic Active-Edge Branching**: Conditional branch evaluation (`action:condition`) activates only taken edges while allowing converging merge/join nodes (`action:completion`) to execute safely without premature skips.
- **Sandboxed Expression Engine**: Mustache-style expression resolution (`{{ trigger.field }}`, `{{ nodes.node_id.output }}`) with strict dot-path traversal, zero `eval`, and full isolation against prototype pollution.

### 2. Autonomous AI Agent Runtime & Safety Guardrails
- **Bounded Autonomous Loops**: Multi-step agent execution powered by pluggable providers (deterministic mock LLM or OpenAI API).
- **Execution Budgets**: Strict iteration limits (`maxIterations: 5`) and total execution timeouts prevent infinite reasoning loops or runaway token usage.
- **Connector Tool Whitelisting**: The agent runtime only allows tools explicitly permitted in the node configuration (`allowedTools: ['email:send', 'crm:create_lead']`), throwing immediately if an unauthorized tool call is attempted.

### 3. Human-in-the-Loop Approvals (`action:approval`)
- **Durable Pausing**: When reaching an approval node, execution pauses durably with status `WAITING_FOR_APPROVAL` and registers an audit record in the database.
- **Role-Based Inbox**: Approvers review execution context, input parameters, and urgency in the Web Approval Inbox.
- **Resumption**: Decision (`APPROVED` / `REJECTED`) with optional notes resumes execution from the exact paused node without re-running earlier steps.

### 4. Zero-Trust Security Perimeter
- **SSRF Defense Suite**: Prohibits requests to `127.0.0.0/8`, `localhost`, `[::1]`, RFC 1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), IPv4-mapped IPv6 formats, link-local addresses, and cloud provider metadata endpoints (`169.254.169.254`, `metadata.google.internal`). Sensitive internal ports (22, 445, 2375, 5432, 6379, etc.) are blocked.
- **Redirect Chain Interception**: Manually validates HTTP 301/302/307/308 redirect targets before following, neutralizing blind SSRF bounces.
- **HMAC Replay Tolerance Window**: Inbound and outbound webhooks use `HMAC-SHA256` signatures verified in constant time (`crypto.timingSafeEqual`). Replay attacks older than 300 seconds (or drifted into the future) are rejected with 401 Unauthorized.
- **AES-256-GCM Envelope Encryption**: Credentials stored at rest use 96-bit unique IVs and 128-bit authentication tags. Zero plaintext credentials exist in database tables, and API responses never expose decrypted keys.
- **Log Data Scrubbing**: Structured JSON logger automatically strips and redacts sensitive keys (`password`, `secret`, `authorization`, `cookie`, `apiKey`, `token`, `jwt`, `masterKey`).

---

## Production Demo Workflows

The platform includes 4 end-to-end enterprise workflow blueprints in `packages/domain/src/fixtures/`:

| Blueprint | Trigger | AI Agent Step | Critical Operations | Join / Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **Workflow A: Lead Capture & Qualification** | Inbound Webhook | Intent Classification & Detail Extraction | Conditional Branching (`score >= 80`), CRM Lead Creation | Priority AE Email Notification & Summary |
| **Workflow B: Customer Support Triage** | Manual / Inbound | Urgency & Sentiment Triage | Emergency Outage Branch (`CRITICAL_OUTAGE`) | Slack PagerDuty Alert + CRM Ticket Activity |
| **Workflow C: Invoice Approval** | Invoice Webhook | Invoice Field Extraction | Threshold Branching (`amount > 5000`) -> Human Approver Checkpoint | Payment Dispatch & Remittance Email |
| **Workflow D: Scheduled Data Sync** | Cron Schedule | Data Schema Normalization | HTTP REST Fetch -> Transform -> Bulk Upsert | External ERP to Internal CRM Synchronization |

---

## Monorepo Layout

```
AI-Automation-Platform-Public/
├── apps/
│   ├── api/                    # Fastify 5 REST API Gateway & Background Services
│   └── web/                    # React 18 + Vite 6 + Tailwind Flow Canvas
├── database/
│   ├── schema.prisma           # Multi-tenant PostgreSQL schema
│   └── seeds/seed.ts           # Enterprise database seed script
├── packages/
│   ├── agent-runtime/          # Bounded AI Agent execution loop & LLM providers
│   ├── connectors/             # HTTP (SSRF-safe), Webhook, Email, Slack, CRM
│   ├── domain/                 # Domain models, Zod schemas & workflow fixtures
│   ├── shared/                 # AES-256-GCM crypto, HMAC, errors, logger, path evaluator
│   └── workflow-engine/        # Kahn's DAG validator, DAG executor, node executors
└── tests/
    ├── e2e/                    # End-to-end demo workflow execution tests
    ├── security/               # SSRF attacks, webhook replay, zero-plaintext, tenant isolation
    └── unit/                   # DAG engine, connectors, expressions, RBAC, agent runtime
```

---

## Quickstart

### 1. Prerequisites
- **Node.js**: `v20.0.0` or higher
- **pnpm**: `v9.0.0` or higher
- **Docker**: Docker Desktop (for PostgreSQL container)

### 2. Start PostgreSQL Container
```powershell
docker run -d `
  --name nexora-automation-db `
  -e POSTGRES_USER=nexora `
  -e POSTGRES_PASSWORD=nexora_secret `
  -e POSTGRES_DB=nexora_automation `
  -p 5433:5432 `
  postgres:16-alpine
```

### 3. Install Dependencies & Setup Environment
```powershell
pnpm install
```

Configure your `.env` in the root and in `apps/api`:
```env
DATABASE_URL="postgresql://nexora:nexora_secret@localhost:5433/nexora_automation?schema=public"
JWT_SECRET="nexora-enterprise-jwt-super-secret-development-key-32chars"
ENCRYPTION_MASTER_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
PORT=3000
LOG_LEVEL="info"
```

### 4. Database Migration & Seed
```powershell
pnpm db:push
pnpm db:seed
```

### 5. Running the Application
```powershell
# Start API Gateway in dev mode
pnpm --filter @nexora/api run dev

# Start Frontend Canvas in dev mode
pnpm --filter @nexora/web run dev
```

---

## Testing & Verification Matrix

The repository maintains 100% pass status across 14 test suites and 118 unit, security, and E2E validation tests:

```powershell
pnpm test
```

```
 ✓ tests/security/ssrf-attacks.test.ts (58 tests)
 ✓ tests/security/webhook-replay.test.ts (7 tests)
 ✓ tests/security/zero-plaintext.test.ts (5 tests)
 ✓ tests/security/tenant-isolation.test.ts (2 tests)
 ✓ tests/e2e/demo-workflows.test.ts (4 tests)
 ✓ tests/unit/connectors.test.ts (8 tests)
 ✓ tests/unit/agent-runtime.test.ts (4 tests)
 ✓ tests/unit/dag-executor.test.ts (3 tests)
 ✓ tests/unit/dag-validator.test.ts (5 tests)
 ✓ tests/unit/encryption.test.ts (7 tests)
 ✓ tests/unit/expression-engine.test.ts (3 tests)
 ✓ tests/unit/path-evaluator.test.ts (5 tests)
 ✓ tests/unit/rbac.test.ts (5 tests)
 ✓ tests/unit/connector-registry.test.ts (2 tests)

 Test Files  14 passed (14)
      Tests  118 passed (118)
```

To run individual test groups:
```powershell
pnpm test:security      # Run SSRF, Replay & Zero-Plaintext suites
pnpm test:e2e           # Run 4 Production Demo Workflows
pnpm test:unit          # Run Unit tests
pnpm typecheck          # Run monorepo TypeScript verification
pnpm build              # Build API & Web production assets
```

---

## License

This project is licensed under the MIT License - see the LICENSE file for details. Built by [leonoriegag](https://github.com/leonoriegag).
