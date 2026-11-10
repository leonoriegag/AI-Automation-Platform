import type { WorkflowGraph } from '../workflow.js';

/**
 * Workflow B: Customer Support Triage
 * Ingests customer support ticket -> classifies urgency via AI -> conditional branch
 * -> escalates critical outages to Slack incident room, or records standard ticket.
 */
export const customerSupportWorkflowGraph: WorkflowGraph = {
  nodes: [
    {
      id: 'support_ticket_trigger',
      type: 'trigger:manual',
      name: 'Support Ticket Submission',
      config: {},
      position: { x: 250, y: 50 },
    },
    {
      id: 'ai_triage_urgency',
      type: 'action:ai:classify',
      name: 'Classify Urgency & Sentiment',
      config: {
        inputTemplate: '{{ trigger.subject }} - {{ trigger.message }}',
        categories: ['CRITICAL_OUTAGE', 'BILLING_ISSUE', 'FEATURE_REQUEST', 'GENERAL_SUPPORT'],
        provider: 'mock',
      },
      position: { x: 250, y: 170 },
    },
    {
      id: 'check_critical_incident',
      type: 'action:condition',
      name: 'Check If Critical Outage',
      config: {
        left: '{{ nodes.ai_triage_urgency.category }}',
        operator: '==',
        right: 'CRITICAL_OUTAGE',
      },
      position: { x: 250, y: 290 },
    },
    {
      id: 'slack_incident_room',
      type: 'action:http',
      name: 'Alert On-Call Incident Channel',
      config: {
        method: 'POST',
        url: 'https://hooks.slack.com/services/mock/incident-alerts',
        body: {
          text: '🚨 Critical Customer Incident: {{ trigger.subject }} from {{ trigger.email }}',
        },
      },
      position: { x: 100, y: 420 },
    },
    {
      id: 'crm_record_urgent_activity',
      type: 'action:crm',
      name: 'Record Urgent Activity',
      config: {
        operation: 'add_activity',
        data: {
          type: 'INCIDENT',
          subject: 'Critical ticket submitted: {{ trigger.subject }}',
        },
      },
      position: { x: 100, y: 540 },
    },
    {
      id: 'email_acknowledgement',
      type: 'action:email',
      name: 'Send Standard Acknowledgement',
      config: {
        to: '{{ trigger.email }}',
        subject: 'Support Ticket Received: {{ trigger.subject }}',
        body: 'Thank you for contacting support. Our team will review your inquiry shortly.',
      },
      position: { x: 400, y: 420 },
    },
    {
      id: 'triage_completion',
      type: 'action:completion',
      name: 'Triage Finished',
      config: {
        summary: 'Support triage completed. Category: {{ nodes.ai_triage_urgency.category }}',
        outputs: ['ai_triage_urgency'],
      },
      position: { x: 250, y: 680 },
    },
  ],
  edges: [
    { id: 'e1', source: 'support_ticket_trigger', target: 'ai_triage_urgency', sourceHandle: 'default', targetHandle: 'default' },
    { id: 'e2', source: 'ai_triage_urgency', target: 'check_critical_incident', sourceHandle: 'default', targetHandle: 'default' },
    { id: 'e3', source: 'check_critical_incident', target: 'slack_incident_room', sourceHandle: 'true', targetHandle: 'default', ...({ label: 'true' } as any) },
    { id: 'e4', source: 'slack_incident_room', target: 'crm_record_urgent_activity', sourceHandle: 'default', targetHandle: 'default' },
    { id: 'e5', source: 'crm_record_urgent_activity', target: 'triage_completion', sourceHandle: 'default', targetHandle: 'default' },
    { id: 'e6', source: 'check_critical_incident', target: 'email_acknowledgement', sourceHandle: 'false', targetHandle: 'default', ...({ label: 'false' } as any) },
    { id: 'e7', source: 'email_acknowledgement', target: 'triage_completion', sourceHandle: 'default', targetHandle: 'default' },
  ],
};
