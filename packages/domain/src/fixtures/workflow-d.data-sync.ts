import type { WorkflowGraph } from '../workflow.js';

/**
 * Workflow D: Cross-System Data Sync (Scheduled)
 * Triggered on cron schedule -> fetches remote updates via HTTP REST -> formats data
 * -> synchronizes contact updates into CRM -> logs completion status.
 */
export const dataSyncWorkflowGraph: WorkflowGraph = {
  nodes: [
    {
      id: 'cron_nightly_trigger',
      type: 'trigger:schedule',
      name: 'Nightly Sync Schedule',
      config: {
        cron: '0 2 * * *',
      },
      position: { x: 250, y: 50 },
    },
    {
      id: 'fetch_remote_updates',
      type: 'action:http',
      name: 'Fetch External SaaS Updates',
      config: {
        method: 'GET',
        url: 'https://api.github.com/zen',
        timeoutMs: 8000,
      },
      position: { x: 250, y: 170 },
    },
    {
      id: 'transform_payload',
      type: 'action:transform',
      name: 'Format Normalized Records',
      config: {
        mapping: {
          syncedStatus: 'SUCCESS',
          syncTimestamp: '{{ trigger.firedAt }}',
          externalQuote: '{{ nodes.fetch_remote_updates.body }}',
        },
      },
      position: { x: 250, y: 290 },
    },
    {
      id: 'sync_crm_contact',
      type: 'action:crm',
      name: 'Update CRM Contact Sync',
      config: {
        operation: 'create_contact',
        data: {
          email: 'sync-auditor@nexora.io',
          firstName: 'Sync',
          lastName: 'Daemon',
          company: 'NEXORA Platform',
        },
      },
      position: { x: 250, y: 410 },
    },
    {
      id: 'data_sync_completion',
      type: 'action:completion',
      name: 'Sync Completed',
      config: {
        summary: 'Cross-system data sync finalized successfully.',
        outputs: ['transform_payload', 'sync_crm_contact'],
      },
      position: { x: 250, y: 530 },
    },
  ],
  edges: [
    { id: 'e1', source: 'cron_nightly_trigger', target: 'fetch_remote_updates', sourceHandle: 'default', targetHandle: 'default' },
    { id: 'e2', source: 'fetch_remote_updates', target: 'transform_payload', sourceHandle: 'default', targetHandle: 'default' },
    { id: 'e3', source: 'transform_payload', target: 'sync_crm_contact', sourceHandle: 'default', targetHandle: 'default' },
    { id: 'e4', source: 'sync_crm_contact', target: 'data_sync_completion', sourceHandle: 'default', targetHandle: 'default' },
  ],
};
