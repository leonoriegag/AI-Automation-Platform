import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Layers,
  Play,
  Save,
  Plus,
  CheckCircle2,
  Clock,
  Terminal,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

import { WorkflowNodeComponent } from './components/canvas/WorkflowNode.js';
import { NodeConfigDrawer } from './components/canvas/NodeConfigDrawer.js';
import {
  ExecutionInspector,
  type ExecutionDetails,
} from './components/inspector/ExecutionInspector.js';
import { ApprovalInbox, type ApprovalItem } from './components/inbox/ApprovalInbox.js';

const initialNodes: Node[] = [
  {
    id: 'trigger_1',
    type: 'workflowNode',
    position: { x: 250, y: 50 },
    data: { label: 'Inbound Webhook', type: 'trigger:webhook', status: 'COMPLETED' },
  },
  {
    id: 'classify_1',
    type: 'workflowNode',
    position: { x: 250, y: 180 },
    data: {
      label: 'AI Intent Classifier',
      type: 'action:ai:classify',
      status: 'COMPLETED',
      config: { categories: ['enterprise', 'support', 'billing'] },
    },
  },
  {
    id: 'condition_1',
    type: 'workflowNode',
    position: { x: 250, y: 310 },
    data: {
      label: 'Check High Value',
      type: 'action:condition',
      status: 'COMPLETED',
      config: { left: '{{ trigger.score }}', operator: '>=', right: '80' },
    },
  },
  {
    id: 'approval_1',
    type: 'workflowNode',
    position: { x: 100, y: 460 },
    data: {
      label: 'VP Sales Approval',
      type: 'action:approval',
      status: 'WAITING',
      config: { title: 'Approve Enterprise Discount' },
    },
  },
  {
    id: 'crm_1',
    type: 'workflowNode',
    position: { x: 400, y: 460 },
    data: {
      label: 'Record CRM Lead',
      type: 'action:crm',
      status: 'IDLE',
      config: { operation: 'create_lead' },
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'trigger_1', target: 'classify_1' },
  { id: 'e2-3', source: 'classify_1', target: 'condition_1' },
  { id: 'e3-4', source: 'condition_1', target: 'approval_1', sourceHandle: 'true', label: 'true' },
  { id: 'e3-5', source: 'condition_1', target: 'crm_1', sourceHandle: 'false', label: 'false' },
];

export function App() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [activeTab, setActiveTab] = useState<'canvas' | 'approvals'>('canvas');
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Inspector & Demo state
  const [currentExecution, setCurrentExecution] = useState<ExecutionDetails>({
    id: 'exec-demo-8492',
    workflowId: 'wf-lead-triage',
    workflowName: 'Enterprise Lead Qualification & Dispatch',
    status: 'WAITING',
    triggerType: 'trigger:webhook',
    startedAt: new Date(Date.now() - 45000).toISOString(),
    durationMs: 45000,
    steps: [
      {
        nodeId: 'trigger_1',
        nodeType: 'trigger:webhook',
        status: 'COMPLETED',
        durationMs: 2,
        output: { event: 'lead.created', email: 'director@fortune500.com', score: 92 },
      },
      {
        nodeId: 'classify_1',
        nodeType: 'action:ai:classify',
        status: 'COMPLETED',
        durationMs: 310,
        output: { category: 'enterprise', confidence: 0.96, reasoning: 'High-value enterprise domain' },
      },
      {
        nodeId: 'condition_1',
        nodeType: 'action:condition',
        status: 'COMPLETED',
        durationMs: 1,
        output: { matched: true, branch: 'true' },
      },
      {
        nodeId: 'approval_1',
        nodeType: 'action:approval',
        status: 'WAITING',
      },
    ],
  });

  const [approvals, setApprovals] = useState<ApprovalItem[]>([
    {
      id: 'appr-101',
      title: 'Approve Enterprise Discount for Fortune 500 Inc',
      workflowName: 'Enterprise Lead Qualification & Dispatch',
      executionId: 'exec-demo-8492',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      payload: {
        company: 'Fortune 500 Inc',
        requestedDiscount: '25%',
        annualContractValue: '$120,000',
        decisionMaker: 'VP of Engineering',
      },
    },
  ]);

  const nodeTypes = useMemo(() => ({ workflowNode: WorkflowNodeComponent }), []);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  const handleUpdateNodeConfig = (nodeId: string, updatedConfig: Record<string, any>, updatedName: string) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: { ...n.data, config: updatedConfig, label: updatedName },
          };
        }
        return n;
      })
    );
  };

  const handleApprovalDecision = async (id: string, decision: 'APPROVED' | 'REJECTED', notes: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));

    // Update node status on canvas
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === 'approval_1') {
          return {
            ...n,
            data: {
              ...n.data,
              status: decision === 'APPROVED' ? 'COMPLETED' : 'FAILED',
            },
          };
        }
        return n;
      })
    );

    // Update execution details
    setCurrentExecution((prev) => ({
      ...prev,
      status: decision === 'APPROVED' ? 'COMPLETED' : 'FAILED',
      steps: prev.steps.map((s) =>
        s.nodeId === 'approval_1'
          ? {
              ...s,
              status: decision === 'APPROVED' ? 'COMPLETED' : 'FAILED',
              durationMs: 12,
              output: { decision, notes, decidedBy: 'admin@nexora.io' },
            }
          : s
      ),
    }));
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-surface-950 select-none">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <span className="font-bold text-sm text-emerald-400">NX</span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
              NEXORA Operations
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PORTFOLIO
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Enterprise AI Workflow Automation
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('canvas')}
            className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'canvas' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            DAG Canvas
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 relative ${
              activeTab === 'approvals' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-rose-400" />
            Approvals
            {approvals.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsInspectorOpen(true)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            Execution Inspector
          </button>
          <button className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-colors">
            <Play className="w-3.5 h-3.5" />
            Run Workflow
          </button>
        </div>
      </header>

      {/* Main Interactive Workspace Area */}
      <main className="flex-1 relative overflow-hidden">
        {activeTab === 'canvas' ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
            className="bg-surface-950"
          >
            <Background color="#1e293b" gap={20} size={1} />
            <Controls className="!bg-slate-900 !border-slate-800 !text-slate-300 fill-slate-300" />
            <MiniMap
              nodeStrokeColor="#10b981"
              nodeColor="#0f172a"
              className="!bg-slate-900/80 !border-slate-800"
            />
          </ReactFlow>
        ) : (
          <ApprovalInbox approvals={approvals} onDecide={handleApprovalDecision} />
        )}
      </main>

      {/* Slide-out Drawers */}
      <NodeConfigDrawer
        node={
          selectedNode
            ? {
                id: selectedNode.id,
                type: (selectedNode.data as any)?.type || '',
                name: (selectedNode.data as any)?.label || '',
                config: (selectedNode.data as any)?.config || {},
              }
            : null
        }
        isOpen={Boolean(selectedNode && activeTab === 'canvas')}
        onClose={() => setSelectedNode(null)}
        onSave={handleUpdateNodeConfig}
      />

      <ExecutionInspector
        execution={currentExecution}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
      />
    </div>
  );
}

export default App;
