# ADR-006: AI Agent Bounded Execution & Tool Whitelisting

## Status
Accepted

## Context
Integrating LLM-powered autonomous agents into enterprise business processes introduces unique operational risks:
- Unbounded loops generating infinite API calls and extreme costs.
- Hallucinated arguments to external endpoints.
- Privilege escalation: an agent performing actions beyond the invoking user's authorization or cross-tenant boundaries.

## Decision
We implemented a **Policy-Bounded Agent Loop** with explicit tool whitelisting:
1. **Hard Execution Limits**: Iteration limit (max 10, default 5), tool call limit (default 5), wall-clock timeout (default 30s), and token budget.
2. **Explicit Tool Whitelist**: An agent node can only invoke tools explicitly enumerated in its node configuration (`allowedTools: string[]`).
3. **No Direct System Access**: Tools are strictly mapped to registered connector operations. The agent has no access to arbitrary shell commands, raw SQL queries, or file system access.
4. **Deterministic Mock Fallback**: Includes a deterministic mock LLM provider for offline testing and continuous integration without API keys.

## Consequences

### Positive
- **Guaranteed Termination**: Agents can never execute infinite loops.
- **Auditable Action Trail**: Every tool call, intermediate thought, and final structured output is persisted in the execution trace.
- **Deterministic Reliability**: The platform can be fully evaluated offline without active OpenAI or Gemini API keys.

### Negative / Trade-offs
- Agents cannot dynamically discover and use unconfigured tools on the fly, sacrificing extreme open-endedness in favor of enterprise safety and predictability.
