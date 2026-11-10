# ADR-005: Pluggable Connector Contract Architecture

## Status
Accepted

## Context
Enterprise platforms need to integrate with diverse SaaS providers (CRM, Email, Slack, REST APIs). Hardcoding integration logic directly into the workflow engine creates tight coupling, makes testing difficult, and complicates adding new providers.

We evaluated:
1. **Monolithic Action Handlers**: Writing integration code directly in a monolithic switch-statement inside the step runner.
2. **Pluggable Connector SDK Contract**: Standardized contract (`ConnectorContract`) defining metadata, config schemas, operation registry, input/output Zod schemas, rate limits, and isolated execution handlers.

## Decision
We adopted the **Pluggable Connector Contract Architecture**. All integrations (HTTP, Webhook, CRM, Email, Slack) implement the uniform `ConnectorContract` and register with a central `ConnectorRegistry`.

## Consequences

### Positive
- **Decoupled Engine**: The workflow runtime executes connectors uniformly through the contract without knowing connector-specific protocol details.
- **Offline Mocking**: Testing and offline operation are seamless: a mock connector implements the exact same contract as a live connector, enabling 100% offline workflow execution.
- **Contract-Driven Tool Calling**: AI agents can inspect connector operation schemas and invoke them directly as LLM tools without duplicate wrapper code.
- **Centralized Security Enforcement**: SSRF filtering, rate limiting, and credential injection are applied systematically across all connector calls.

### Negative / Trade-offs
- Slight development overhead in defining formal Zod schemas and metadata for each connector operation.
