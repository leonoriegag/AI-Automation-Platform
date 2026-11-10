# ADR-008: Durable Human Approval Gates and Resumption Engine

## Status
Accepted

## Context
High-value automated processes (e.g., approving customer refunds, large sales discounts, or sensitive data syncs) require human oversight before proceeding. 

We evaluated:
1. **Synchronous Polling / Blocking Workers**: Keeping a worker thread or HTTP request open while waiting for a human decision. This quickly exhausts server resources and connection pools.
2. **Durable State Suspension & Event-Driven Resumption**: Persisting workflow execution in a `WAITING` state, releasing all worker resources, and re-enqueueing a resumption job when an authorized user submits an approval or rejection.

## Decision
We implemented **Durable State Suspension & Event-Driven Resumption**:
- When the execution engine encounters an `action:approval` node, it writes an `ApprovalRequest` record to the database, transitions the execution status to `WAITING`, and terminates the active worker task cleanly.
- The approval request appears in the organization's Approval Inbox in the frontend.
- When an authorized approver submits a decision (`APPROVED` or `REJECTED`) with optional notes, the API transitions the `ApprovalRequest` to `RESOLVED`, updates execution context, and enqueues a `workflow:resume` job.
- The worker claims the resume job, updates the execution to `RUNNING`, and resumes DAG traversal from the approved node's child edges.

## Consequences

### Positive
- **Resource Efficiency**: Zero threads, memory, or connections are consumed while waiting hours or days for human approval.
- **Resilience**: Even if server instances restart, the execution remains safely paused in the database.
- **Audit Compliance**: Complete record of who approved the action, at what time, with what justification, and what the exact execution context was at that moment.

### Negative / Trade-offs
- Requires timeout handling logic for expired approval requests (e.g. auto-reject or escalate after $N$ hours).
