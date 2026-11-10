import React, { useState } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  Layers,
  Terminal,
} from 'lucide-react';

export interface StepRecord {
  nodeId: string;
  nodeType: string;
  status: 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'RUNNING' | 'WAITING';
  durationMs?: number;
  input?: unknown;
  output?: unknown;
  error?: string;
}

export interface ExecutionDetails {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'WAITING';
  triggerType: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  steps: StepRecord[];
  finalOutput?: unknown;
}

interface ExecutionInspectorProps {
  execution: ExecutionDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExecutionInspector: React.FC<ExecutionInspectorProps> = ({
  execution,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !execution) return null;

  const [expandedStep, setExpandedStep] = useState<string | null>(
    execution.steps[0]?.nodeId || null
  );

  const toggleStep = (nodeId: string) => {
    setExpandedStep((prev) => (prev === nodeId ? null : nodeId));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> COMPLETED
          </span>
        );
      case 'FAILED':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3 h-3" /> FAILED
          </span>
        );
      case 'WAITING':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
            <Clock className="w-3 h-3" /> WAITING APPROVAL
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <Play className="w-3 h-3 animate-spin" /> RUNNING
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[450px] bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100 truncate max-w-[240px]">
              {execution.workflowName}
            </h3>
          </div>
          <div className="text-[10px] font-mono text-slate-500">ID: {execution.id}</div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Execution Summary Bar */}
      <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Status</div>
          <div className="mt-1">{getStatusBadge(execution.status)}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Duration</div>
          <div className="mt-1 text-xs font-mono text-slate-200">
            {execution.durationMs !== undefined ? `${execution.durationMs}ms` : 'In progress...'}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Trigger</div>
          <div className="mt-1 text-xs font-mono text-emerald-400 truncate max-w-[90px]">
            {execution.triggerType}
          </div>
        </div>
      </div>

      {/* Step by Step Timeline List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          Step Executions ({execution.steps.length})
        </div>

        {execution.steps.map((step, idx) => {
          const isExpanded = expandedStep === step.nodeId;

          return (
            <div
              key={step.nodeId}
              className="bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden transition-all"
            >
              {/* Step Header */}
              <button
                onClick={() => toggleStep(step.nodeId)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="text-xs font-medium text-slate-200">{step.nodeId}</div>
                    <div className="text-[10px] font-mono text-slate-500">{step.nodeType}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {step.durationMs !== undefined && (
                    <span className="text-[10px] font-mono text-slate-500">
                      {step.durationMs}ms
                    </span>
                  )}
                  {getStatusBadge(step.status)}
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Step JSON Payloads */}
              {isExpanded && (
                <div className="p-3 border-t border-slate-800/60 bg-slate-950 text-xs font-mono space-y-3">
                  {step.error && (
                    <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                      {step.error}
                    </div>
                  )}

                  {step.output !== undefined && (
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                        Output Data
                      </div>
                      <pre className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-emerald-300/90 overflow-x-auto max-h-48">
                        {JSON.stringify(step.output, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
