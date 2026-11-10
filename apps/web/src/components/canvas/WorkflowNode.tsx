import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Play,
  Webhook,
  Calendar,
  Globe,
  Sliders,
  GitBranch,
  Clock,
  Sparkles,
  FileSearch,
  Bot,
  UserCheck,
  Mail,
  Users,
  CheckCircle2,
} from 'lucide-react';

interface CustomNodeProps {
  id: string;
  data: {
    label: string;
    type: string;
    config?: Record<string, any>;
    status?: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'WAITING';
  };
  selected: boolean;
}

export const WorkflowNodeComponent: React.FC<CustomNodeProps> = memo(({ data, selected }) => {
  const isTrigger = data.type.startsWith('trigger:');
  const isAction = data.type.startsWith('action:');
  const isAi = data.type.includes('ai:') || data.type.includes('agent:');
  const isApproval = data.type === 'action:approval';

  const getIcon = () => {
    switch (data.type) {
      case 'trigger:manual': return <Play className="w-4 h-4 text-emerald-400" />;
      case 'trigger:webhook': return <Webhook className="w-4 h-4 text-emerald-400" />;
      case 'trigger:schedule': return <Calendar className="w-4 h-4 text-emerald-400" />;
      case 'action:http': return <Globe className="w-4 h-4 text-sky-400" />;
      case 'action:transform': return <Sliders className="w-4 h-4 text-sky-400" />;
      case 'action:condition': return <GitBranch className="w-4 h-4 text-amber-400" />;
      case 'action:delay': return <Clock className="w-4 h-4 text-slate-400" />;
      case 'action:ai:classify': return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'action:ai:extract': return <FileSearch className="w-4 h-4 text-purple-400" />;
      case 'action:agent:tool': return <Bot className="w-4 h-4 text-indigo-400" />;
      case 'action:approval': return <UserCheck className="w-4 h-4 text-rose-400" />;
      case 'action:email': return <Mail className="w-4 h-4 text-blue-400" />;
      case 'action:crm': return <Users className="w-4 h-4 text-amber-500" />;
      case 'action:completion': return <CheckCircle2 className="w-4 h-4 text-teal-400" />;
      default: return <Sliders className="w-4 h-4 text-slate-400" />;
    }
  };

  const getBorderColor = () => {
    if (selected) return 'border-emerald-500 shadow-emerald-950/50 shadow-lg';
    if (data.status === 'RUNNING') return 'border-amber-400 animate-pulse';
    if (data.status === 'COMPLETED') return 'border-emerald-500/70';
    if (data.status === 'FAILED') return 'border-rose-500/70';
    if (data.status === 'WAITING') return 'border-amber-500/70';
    if (isTrigger) return 'border-emerald-500/30';
    if (isAi) return 'border-purple-500/30';
    if (isApproval) return 'border-rose-500/30';
    return 'border-slate-800';
  };

  const getStatusBadge = () => {
    if (!data.status || data.status === 'IDLE') return null;
    const colors: Record<string, string> = {
      RUNNING: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      FAILED: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      SKIPPED: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
      WAITING: 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse',
    };

    return (
      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase ${colors[data.status]}`}>
        {data.status}
      </span>
    );
  };

  return (
    <div
      className={`relative min-w-[220px] max-w-[260px] bg-slate-900/90 backdrop-blur-md rounded-xl p-3 border transition-all duration-150 ${getBorderColor()}`}
    >
      {/* Target input handle (not needed on triggers) */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-slate-400 hover:!bg-emerald-400 transition-colors"
        />
      )}

      {/* Node Header */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50">
            {getIcon()}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-100 truncate max-w-[120px]">
              {data.label}
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {data.type}
            </div>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Node Summary / Configuration Preview */}
      {data.config && Object.keys(data.config).length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 font-mono truncate">
          {data.type === 'action:http' && `${data.config.method || 'GET'} ${data.config.url || ''}`}
          {data.type === 'action:condition' && `${data.config.left || ''} ${data.config.operator || '=='} ${data.config.right || ''}`}
          {data.type === 'action:ai:classify' && `Categories: [${(data.config.categories || []).join(', ')}]`}
          {data.type === 'action:email' && `To: ${data.config.to || ''}`}
          {data.type === 'action:approval' && `Title: ${data.config.title || 'Decision needed'}`}
        </div>
      )}

      {/* Condition handles for True / False branching */}
      {data.type === 'action:condition' ? (
        <>
          <Handle
            id="true"
            type="source"
            position={Position.Bottom}
            className="!left-[25%] !bg-emerald-500 hover:scale-125"
          />
          <Handle
            id="false"
            type="source"
            position={Position.Bottom}
            className="!left-[75%] !bg-rose-500 hover:scale-125"
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-slate-400 hover:!bg-emerald-400 transition-colors"
        />
      )}
    </div>
  );
});

WorkflowNodeComponent.displayName = 'WorkflowNodeComponent';
