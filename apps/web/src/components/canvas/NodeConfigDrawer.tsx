import React, { useState } from 'react';
import { X, Save, Code, Variable } from 'lucide-react';

interface NodeConfigDrawerProps {
  node: {
    id: string;
    type: string;
    name: string;
    config: Record<string, any>;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeId: string, updatedConfig: Record<string, any>, updatedName: string) => void;
}

export const NodeConfigDrawer: React.FC<NodeConfigDrawerProps> = ({
  node,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !node) return null;

  const [name, setName] = useState(node.name);
  const [config, setConfig] = useState<Record<string, any>>(node.config || {});

  const handleFieldChange = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(node.id, config, name);
    onClose();
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Code className="w-4 h-4 text-emerald-400" />
            Configure Node
          </h3>
          <span className="text-xs font-mono text-slate-400">{node.type}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body / Dynamic Config Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Node Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-sans"
          />
        </div>

        {/* Dynamic Type-specific Form Fields */}
        {node.type === 'action:http' && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">HTTP Method</label>
              <select
                value={config.method || 'GET'}
                onChange={(e) => handleFieldChange('method', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target URL</label>
              <input
                type="text"
                placeholder="https://api.example.com/v1/data"
                value={config.url || ''}
                onChange={(e) => handleFieldChange('url', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Supports template: {'{{ nodes.step.id }}'}</span>
            </div>
          </>
        )}

        {node.type === 'action:condition' && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Left Expression</label>
              <input
                type="text"
                placeholder="{{ trigger.score }}"
                value={config.left || ''}
                onChange={(e) => handleFieldChange('left', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Operator</label>
              <select
                value={config.operator || '=='}
                onChange={(e) => handleFieldChange('operator', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="==">== (Equal)</option>
                <option value="!=">!= (Not Equal)</option>
                <option value=">">&gt; (Greater than)</option>
                <option value=">=">&gt;= (Greater than or equal)</option>
                <option value="<">&lt; (Less than)</option>
                <option value="<=">&lt;= (Less than or equal)</option>
                <option value="contains">contains</option>
                <option value="startsWith">startsWith</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Right Value</label>
              <input
                type="text"
                placeholder="80"
                value={config.right || ''}
                onChange={(e) => handleFieldChange('right', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </>
        )}

        {node.type === 'action:ai:classify' && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Input Text Template</label>
              <textarea
                rows={3}
                placeholder="{{ trigger.emailBody }}"
                value={config.inputTemplate || ''}
                onChange={(e) => handleFieldChange('inputTemplate', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Categories (comma-separated)</label>
              <input
                type="text"
                placeholder="billing, technical, sales, partner"
                value={(config.categories || []).join(', ')}
                onChange={(e) =>
                  handleFieldChange(
                    'categories',
                    e.target.value.split(',').map((c) => c.trim())
                  )
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </>
        )}

        {node.type === 'action:approval' && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Approval Title</label>
              <input
                type="text"
                placeholder="Approve enterprise quote for {{ nodes.lead.company }}"
                value={config.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Assignee Role</label>
              <select
                value={config.assigneeRole || 'APPROVER'}
                onChange={(e) => handleFieldChange('assigneeRole', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="APPROVER">APPROVER</option>
                <option value="ORG_ADMIN">ORG_ADMIN</option>
                <option value="WORKFLOW_EDITOR">WORKFLOW_EDITOR</option>
              </select>
            </div>
          </>
        )}

        {/* Template Variables Helper Pill */}
        <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 mt-6">
          <div className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-2">
            <Variable className="w-3.5 h-3.5 text-emerald-400" />
            Template Variables Quick Reference
          </div>
          <div className="text-[11px] text-slate-400 font-mono space-y-1">
            <div><span className="text-emerald-400">{'{{ trigger.* }}'}</span> Trigger payload</div>
            <div><span className="text-emerald-400">{'{{ nodes.<id>.* }}'}</span> Upstream node output</div>
            <div><span className="text-emerald-400">{'{{ execution.id }}'}</span> Current execution UUID</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/40"
        >
          <Save className="w-3.5 h-3.5" />
          Apply Changes
        </button>
      </div>
    </div>
  );
};
