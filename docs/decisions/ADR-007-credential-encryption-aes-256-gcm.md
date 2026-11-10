# ADR-007: Authenticated Credential Encryption at Rest (AES-256-GCM)

## Status
Accepted

## Context
Automation platforms store third-party API keys, bearer tokens, and webhook secrets. Storing plaintext secrets in the database is a critical vulnerability. 

We evaluated:
1. **Plaintext Storage**: Unacceptable security risk.
2. **Cloud KMS (AWS KMS, GCP KMS, HashiCorp Vault)**: Best for dedicated production cloud environments, but introduces external infrastructure dependencies that prevent reproducible local runs.
3. **Application-Level Authenticated Encryption (AES-256-GCM)**: Symmetric authenticated encryption using an environment-derived 256-bit master key.

## Decision
We implemented **AES-256-GCM authenticated encryption at rest**:
- Each credential is encrypted using a unique, cryptographically random 12-byte Initialization Vector (IV).
- Authenticity is validated using a 16-byte GCM authentication tag to detect any tampering or bit-flipping.
- The master key is supplied via the `ENCRYPTION_MASTER_KEY` environment variable.
- Workflow definitions store foreign key references (`credentialId`), never the secret value.
- REST API responses redact secret contents, exposing only metadata.

## Consequences

### Positive
- **Zero-Dependency Local Security**: Production-grade encryption works in local Docker environments without external cloud KMS accounts.
- **Tamper Evidence**: GCM mode verifies both confidentiality and integrity.
- **Clean Extensibility**: The encryption service interface can be easily adapted to AWS KMS or Azure Key Vault for production cloud deployments without altering application logic.

### Negative / Trade-offs
- Key management responsibility resides with environment configuration. Key rotation requires a documented re-encryption script.
