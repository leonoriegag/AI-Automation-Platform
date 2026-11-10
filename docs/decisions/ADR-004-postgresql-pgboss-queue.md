# ADR-004: Job Queue Selection — PostgreSQL-backed `pg-boss`

## Status
Accepted

## Context
Asynchronous job processing is necessary to decouple webhook intake and API requests from long-running workflow executions. We evaluated:
1. **Redis + BullMQ**: Industry standard for Node.js, high throughput, but introduces an extra required database dependency (Redis) for local setup, CI, and production deployment.
2. **RabbitMQ / Kafka**: Heavyweight messaging middleware, high operational complexity, disproportionate for a portfolio showcase.
3. **PostgreSQL-backed Queue (`pg-boss`)**: Leverages existing PostgreSQL 16 database with `SKIP LOCKED` primitives for atomic job dispatch.

## Decision
We selected **`pg-boss`** backed by the platform's existing PostgreSQL database.

## Consequences

### Positive
- **Zero Additional Infrastructure**: Developers and recruiters run only PostgreSQL. No Redis or broker container required.
- **Transactional Enqueueing**: Workflows can record an execution row and enqueue its execution job in the exact same PostgreSQL transaction, completely eliminating split-brain states where a record exists without a queue item or vice-versa.
- **Reliable Locks via `SKIP LOCKED`**: High-concurrency worker polling without database row deadlocks.
- **Archiving & Retries**: Native support for retry backoff, dead-letter archiving, and job expiration.

### Negative / Trade-offs
- Maximum raw throughput is slightly lower than in-memory Redis queues (tens of thousands of jobs/sec vs hundreds of thousands). However, for enterprise workflow orchestration where network I/O and LLM latencies dominate, database queue throughput is more than sufficient.
