# ADR-001: Adoption of Modular Monolith Architecture

## Status
Accepted

## Context
NEXORA Operations requires an enterprise workflow automation platform capable of orchestrating complex workflows, communicating with external SaaS services, executing AI agent loops, and providing real-time observability. 

We considered two primary architecture styles:
1. **Microservices Architecture**: Dividing the system into separate network services (e.g., Workflow Service, Execution Service, Connector Service, Agent Service, Auth Service).
2. **Modular Monolith**: A unified codebase partitioned into strictly isolated packages with clear domain boundaries, clean interfaces, and single-process execution.

## Decision
We chose a **Modular Monolith** organized in a monorepo structure with distinct packages (`domain`, `workflow-engine`, `connectors`, `agent-runtime`, `shared`) and applications (`apps/api`, `apps/web`).

## Consequences

### Positive
- **Operational Simplicity**: Developers and evaluators can run the entire system locally with a single command (`pnpm dev`) and a standard PostgreSQL database, avoiding complex service mesh, distributed tracing, and multi-service deployment tooling.
- **Transactional Consistency**: Relational database transactions across workflows, executions, and audit records remain atomic and consistent without two-phase commit or distributed saga overhead.
- **Low Latency & High Performance**: In-process method calls eliminate network serialization, HTTP/gRPC overhead, and internal connection pooling bottlenecks.
- **Code Sharing & Refactoring**: TypeScript interfaces are shared across modules with complete type safety.

### Negative / Trade-offs
- Scaling is performed at the process level rather than independently scaling CPU-intensive nodes. (Mitigated by worker concurrency pools and background job queues).
- Requires discipline to prevent leaky abstractions between module boundaries. (Enforced via TypeScript package exports and ESLint boundaries).
