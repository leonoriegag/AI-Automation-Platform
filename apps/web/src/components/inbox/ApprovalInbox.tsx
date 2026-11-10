import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Building,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

export interface ApprovalItem {
  id: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  workflowName: string;
  executionId: string;
  createdAt: string;
  payload: Record<string, any>;
}

interface ApprovalInboxProps {
  approvals: ApprovalItem[];
  onDecide: (id: string, decision: 'APPROVED' | 'REJECTED', notes: string) => Promise<void>;
  onClose?: () => void;
}

export const ApprovalInbox: React.FC<ApprovalInboxProps> = ({
  approvals,
  onDecide,
  onClose,
}) => {
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(
    approvals[0] || null
  );
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAction = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedApproval) return;
    setIsSubmitting(true);
    try {
      await onDecide(selectedApproval.id, decision, decisionNotes);
      setDecisionNotes('');
      // Advance to next pending approval if available
      const remaining = approvals.filter((a) => a.id !== selectedApproval.id);
      setSelectedApproval(remaining[0] || null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Left List Pane */}
      <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/60">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-100">Approval Inbox</h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            {approvals.length} pending
          </span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {approvals.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No pending approvals. All workflow requests resolved!
            </div>
          ) : (
            approvals.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedApproval(item)}
                className={`w-full p-3.5 text-left transition-colors flex flex-col gap-1.5 ${
                  selectedApproval?.id === item.id
                    ? 'bg-slate-800/80 border-l-2 border-emerald-500'
                    : 'hover:bg-slate-800/30'
                }`}
              >
                <div className="text-xs font-medium text-slate-200 line-clamp-1">{item.title}</div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <Building className="w-3 h-3 text-slate-500" />
                  <span className="truncate">{item.workflowName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Detail & Action Pane */}
      <div className="flex-1 flex flex-col bg-slate-950 overflow-y-auto">
        {selectedApproval ? (
          <div className="p-6 max-w-2xl flex flex-col gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 mb-3">
                <Clock className="w-3.5 h-3.5" /> Action Required: Human Gate
              </div>
              <h1 className="text-lg font-bold text-slate-100">{selectedApproval.title}</h1>
              <p className="text-xs text-slate-400 mt-1">
                Workflow: <span className="font-semibold text-slate-300">{selectedApproval.workflowName}</span>
              </p>
            </div>

            {/* Context Payload Preview */}
            <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4">
              <h3 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider font-mono">
                Context & Verification Payload
              </h3>
              <pre className="text-xs font-mono text-emerald-300/90 bg-slate-950 p-3 rounded-lg border border-slate-800/60 overflow-x-auto">
                {JSON.stringify(selectedApproval.payload, null, 2)}
              </pre>
            </div>

            {/* Decision Notes Input */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Audit / Justification Notes (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Enter justification for audit log (e.g. 'Verified contract terms under standard discount matrix')"
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={isSubmitting}
                onClick={() => handleAction('APPROVED')}
                className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve & Resume Workflow
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => handleAction('REJECTED')}
                className="py-2.5 px-4 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-medium text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Reject Execution
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
            Select an approval request from the left panel to review.
          </div>
        )}
      </div>
    </div>
  );
};
