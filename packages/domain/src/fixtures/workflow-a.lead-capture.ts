import type { WorkflowGraph } from '../workflow.js';

/**
 * Workflow A: Lead Capture & Qualification
 * Ingests inbound sales inquiry via webhook -> classifies enterprise intent via AI
 * -> branches based on lead score -> registers in CRM -> sends email notification.
 */
export const leadCaptureWorkflowGraph: WorkflowGraph = {
  nodes: [
    {
      id: 'webhook_inbound',
      type: 'trigger:webhook',
      name: 'Inbound Lead Webhook',
      config: {
        event: 'lead.submitted',
      },
      position: { x: 250, y: 50 },
    },
    {
      id: 'ai_classify_intent',
      type: 'action:ai:classify',
      name: 'Classify Lead Intent',
      config: {
        inputTemplate: '{{ trigger.inquiryText }}',
        categories: ['ENTERPRISE', 'MID_MARKET', 'SMB', 'SPAM'],
        provider: 'mock',
      },
      position: { x: 250, y: 170 },
    },
    {
      id: 'ai_extract_details',
      type: 'action:ai:extract',
      name: 'Extract Contact Information',
      config: {
        inputTemplate: '{{ trigger.inquiryText }}',
        schema: {
          company: { type: 'string', description: 'Company Name' },
          estimatedBudget: { type: 'number', description: 'Estimated ARR budget' },
        },
        provider: 'mock',
      },
      position: { x: 250, y: 290 },
    },
    {
      id: 'check_enterprise_tier',
      type: 'action:condition',
      name: 'Check Enterprise Tier',
      config: {
        left: '{{ nodes.ai_classify_intent.category }}',
        operator: '==',
        right: 'ENTERPRISE',
      },
      position: { x: 250, y: 410 },
    },
    {
      id: 'crm_create_enterprise_lead',
      type: 'action:crm',
      name: 'Record Enterprise Lead in CRM',
      config: {
        operation: 'create_lead',
        data: {
          email: '{{ trigger.email }}',
          title: 'Enterprise Inquiry: {{ nodes.ai_extract_details.company }}',
          status: 'QUALIFIED',
          score: 95,
        },
      },
      position: { x: 100, y: 540 },
    },
    {
      id: 'email_notify_sales_exec',
      type: 'action:email',
      name: 'Notify Account Executive',
      config: {
        to: 'sales-leads@nexora.io',
        subject: 'Priority Enterprise Lead: {{ nodes.ai_extract_details.company }}',
        body: 'Lead inquiry received from {{ trigger.email }}. Qualification score: 95.',
      },
      position: { x: 100, y: 660 },
    },
    {
      id: 'crm_create_standard_lead',
      type: 'action:crm',
      name: 'Record Standard Lead',
      config: {
        operation: 'create_lead',
        data: {
          email: '{{ trigger.email }}',
          title: 'Standard Inquiry',
          status: 'NEW',
          score: 50,
        },
      },
      position: { x: 400, y: 540 },
    },
    {
      id: 'completion_summary',
      type: 'action:completion',
      name: 'Workflow Completion',
      config: {
        summary: 'Lead capture and qualification complete for {{ trigger.email }}',
        outputs: ['ai_classify_intent', 'ai_extract_details'],
      },
      position: { x: 250, y: 800 },
    },
  ],
  edges: [
    { id: 'e1', source: 'webhook_inbound', target: 'ai_classify_intent', sourceHandle: 'default', targetHandle: 'default' },
    { id: 'e2', source: 'ai_classify_intent', target: 'ai_extract_details', sourceHandle: 'default', targetHandle: 'default' },
    { id: 'e3', source: 'ai_extract_details', target: 'check_enterprise_tier', sourceHandle: 'default', targetHandle: 'default' },
    { id: 'e4', source: 'check_enterprise_tier', target: 'crm_create_enterprise_lead', sourceHandle: 'true', targetHandle: 'default', ...({ label: 'true' } as any) },
    { id: 'e5', source: 'crm_create_enterprise_lead', target: 'email_notify_sales_exec', sourceHandle: 'default', targetHandle: 'default' },
    { id: 'e6', source: 'email_notify_sales_exec', target: 'completion_summary', sourceHandle: 'default', targetHandle: 'default' },
    { id: 'e7', source: 'check_enterprise_tier', target: 'crm_create_standard_lead', sourceHandle: 'false', targetHandle: 'default', ...({ label: 'false' } as any) },
    { id: 'e8', source: 'crm_create_standard_lead', target: 'completion_summary', sourceHandle: 'default', targetHandle: 'default' },
  ],
};
