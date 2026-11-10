# ADR-003: Persistent Execution State & Reliability Semantics

## Status
Accepted

## Context
A critical differentiator of production orchestration engines is fault tolerance. In the event of network disruption, worker crash, or system restart, the system must not lose the state of active or pending executions.

We evaluated:
1. **In-Memory Volatile State**: Fast, but execution state is lost on worker reboot, and historical audits are impossible.
2. **Snapshot-Per-Step Persistence**: Persisting workflow execution state before and after every individual node transition into a durable relational database.

## Decision
We implemented **Snapshot-Per-Step Durable Persistence** in PostgreSQL:
- Executions transition through explicit states: `PENDING` $\rightarrow$ `RUNNING` $\rightarrow$ (`WAITING`) $\rightarrow$ `COMPLETED` / `FAILED` / `CANCELLED`.
- Each node creates an immutable `StepExecution` record tracking timestamps, input snapshot, output data, error details, and retry attempts.
- Delivery semantics are documented as **At-least-once with idempotency protections**.

## Consequences

### Positive
- **Fault Recovery**: When an engine instance restarts, it re-queries `RUNNING` and `WAITING` executions, resuming from the last uncompleted step without re-running finished side effects.
- **Full Observability & Auditability**: Operators and developers can inspect the exact input and output JSON at every step of historical executions.
- **Durable Pausing**: Long-running approval requests or timed delays can wait days without holding memory locks or active database connections.

### Negative / Trade-offs
- Increased database write volume compared to purely in-memory execution. Mitigated by relational indexes, JSONB column compression, and efficient query design.
