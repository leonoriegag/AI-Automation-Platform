import type { WorkflowGraph } from '../workflow.js';

/**
 * Workflow C: Invoice Processing & Approval
 * Ingests invoice document -> extracts vendor & amount -> branches if amount > $5000
 * -> pauses execution for human approval -> triggers mock ERP payment on approval.
 */
export const invoiceProcessingWorkflowGraph: WorkflowGraph = {
  nodes: [
    {
      id: 'invoice_submitted',
      type: 'trigger:webhook',
      name: 'Invoice Upload Webhook',
      config: {
        event: 'invoice.uploaded',
      },
      position: { x: 250, y: 50 },
    },
    {
      id: 'ai_extract_invoice',
      type: 'action:ai:extract',
      name: 'Extract Invoice Fields',
      config: {
        inputTemplate: '{{ trigger.rawText }}',
        schema: {
          vendor: { type: 'string', description: 'Vendor company name' },
          invoiceNumber: { type: 'string', description: 'Invoice ID' },
          amount: { type: 'number', description: 'Total invoice amount' },
        },
        provider: 'mock',
      },
      position: { x: 250, y: 170 },
    },
    {
      id: 'check_approval_threshold',
      type: 'action:condition',
      name: 'Check If Amount > $5000',
      config: {
        left: '{{ nodes.ai_extract_invoice.amount }}',
        operator: '>',
        right: '5000',
      },
      position: { x: 250, y: 290 },
    },
    {
      id: 'human_manager_approval',
      type: 'action:approval',
      name: 'Finance Manager Approval',
      config: {
        title: 'Approve Invoice Payment for {{ nodes.ai_extract_invoice.vendor }}',
        description: 'Invoice #{{ nodes.ai_extract_invoice.invoiceNumber }} exceeds auto-approval threshold of $5,000.',
        assigneeRole: 'APPROVER',
      },
      position: { x: 100, y: 420 },
    },
    {
      id: 'payment_dispatch',
      type: 'action:email',
      name: 'Dispatch Payment Remittance',
      config: {
        to: 'accounts-payable@enterprise.com',
        subject: 'Payment Released: Invoice #{{ nodes.ai_extract_invoice.invoiceNumber }}',
        body: 'Approved invoice for {{ nodes.ai_extract_invoice.vendor }} of ${{ nodes.ai_extract_invoice.amount }} dispatched for settlement.',
      },
      position: { x: 250, y: 560 },
    },
    {
      id: 'invoice_completion',
      type: 'action:completion',
      name: 'Invoice Processed',
      config: {
        summary: 'Invoice processing completed for {{ nodes.ai_extract_invoice.vendor }}',
        outputs: ['ai_extract_invoice', 'human_manager_approval'],
      },
      position: { x: 250, y: 700 },
    },
  ],
  edges: [
    { id: 'e1', source: 'invoice_submitted', target: 'ai_extract_invoice', sourceHandle: 'default', targetHandle: 'default' },
    { id: 'e2', source: 'ai_extract_invoice', target: 'check_approval_threshold', sourceHandle: 'default', targetHandle: 'default' },
    { id: 'e3', source: 'check_approval_threshold', target: 'human_manager_approval', sourceHandle: 'true', targetHandle: 'default', ...({ label: 'true' } as any) },
    { id: 'e4', source: 'human_manager_approval', target: 'payment_dispatch', sourceHandle: 'default', targetHandle: 'default' },
    { id: 'e5', source: 'check_approval_threshold', target: 'payment_dispatch', sourceHandle: 'false', targetHandle: 'default', ...({ label: 'false' } as any) },
    { id: 'e6', source: 'payment_dispatch', target: 'invoice_completion', sourceHandle: 'default', targetHandle: 'default' },
  ],
};
