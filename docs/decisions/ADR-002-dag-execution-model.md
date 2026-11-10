# ADR-002: Directed Acyclic Graph (DAG) Execution Model

## Status
Accepted

## Context
Workflow orchestration systems vary widely in how execution flow is modeled:
1. **Linear Pipelines**: Sequence of steps executed in order (step 1 $\rightarrow$ step 2 $\rightarrow$ step 3).
2. **Directed Acyclic Graphs (DAG)**: Arbitrary graph with branching, parallel paths, and join points, without recursive cycles.
3. **General Petri Nets / Cyclic Graphs with Arbitrary Looping**: Graphs allowing arbitrary backward edges and loops.

## Decision
We chose a **Directed Acyclic Graph (DAG)** execution model with Kahn's algorithm for static cycle detection and topological sorting.

## Consequences

### Positive
- **Predictable Execution & Determinism**: Topological sorting produces a deterministic order of node dependencies, preventing deadlocks and infinite loops during runtime.
- **Explicit Branching**: Conditional nodes route data along explicit edge handles (`true` vs `false`), making workflow behavior visually clear and auditable.
- **Static Analysis**: The engine validates all upstream variable references before execution begins, ensuring referenced outputs exist and precede the consumer in topological rank.
- **User Interface Alignment**: Modern visual editors (such as React Flow) map directly to DAG nodes and edges without ambiguity.

### Negative / Trade-offs
- While DAGs naturally handle branching, fan-out, and joins, explicit recursive loops must be expressed via batch/collection transformation nodes rather than cyclic edges back to earlier nodes.
