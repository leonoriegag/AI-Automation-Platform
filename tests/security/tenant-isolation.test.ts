import { describe, it, expect, vi } from 'vitest';
import { WorkflowRepository } from '../../apps/api/src/repositories/workflow.repository.js';
import { CredentialRepository } from '../../apps/api/src/repositories/credential.repository.js';
import { NotFoundError } from '@nexora/shared';

describe('Security & Tenant Isolation Protection', () => {
  const orgA = '11111111-1111-1111-1111-111111111111';
  const orgB = '22222222-2222-2222-2222-222222222222';
  const workflowIdOrgA = '33333333-3333-3333-3333-333333333333';
  const credIdOrgA = '44444444-4444-4444-4444-444444444444';

  it('WorkflowRepository should reject Org B accessing Org A workflows', async () => {
    const mockPrisma = {
      workflow: {
        findFirst: vi.fn().mockImplementation(({ where }) => {
          // If query checks orgB for a workflow belonging to orgA, return null
          if (where.organizationId === orgB && where.id === workflowIdOrgA) {
            return Promise.resolve(null);
          }
          if (where.organizationId === orgA && where.id === workflowIdOrgA) {
            return Promise.resolve({
              id: workflowIdOrgA,
              organizationId: orgA,
              name: 'Secret Org A Workflow',
              versions: [{ graph: { nodes: [], edges: [] } }]
            });
          }
          return Promise.resolve(null);
        })
      }
    };

    const repo = new WorkflowRepository(mockPrisma as any);

    // Org A can access its own workflow
    const accessible = await repo.findById(orgA, workflowIdOrgA);
    expect(accessible.id).toBe(workflowIdOrgA);

    // Org B attempting to access Org A workflow must throw NotFoundError (prevents ID enumeration)
    await expect(repo.findById(orgB, workflowIdOrgA)).rejects.toThrow(NotFoundError);
  });

  it('CredentialRepository should reject Org B accessing Org A credentials', async () => {
    const mockPrisma = {
      credential: {
        findFirst: vi.fn().mockImplementation(({ where }) => {
          if (where.organizationId === orgB && where.id === credIdOrgA) {
            return Promise.resolve(null);
          }
          if (where.organizationId === orgA && where.id === credIdOrgA) {
            return Promise.resolve({
              id: credIdOrgA,
              organizationId: orgA,
              name: 'Org A Secret API Key',
              type: 'API_KEY',
              maskedHint: 'sk-a...1234'
            });
          }
          return Promise.resolve(null);
        })
      }
    };

    const repo = new CredentialRepository(mockPrisma as any);

    // Org A can access its own credential metadata
    const cred = await repo.findById(orgA, credIdOrgA);
    expect(cred.id).toBe(credIdOrgA);

    // Org B attempting to access Org A credential must throw NotFoundError
    await expect(repo.findById(orgB, credIdOrgA)).rejects.toThrow(NotFoundError);
  });
});
