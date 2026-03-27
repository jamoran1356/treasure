import { FC } from 'react';

export interface Rule {
  id: number;
  name: string;
  type: 'balance' | 'price' | 'schedule' | 'compliance';
  condition: string;
  action: string;
  isActive: boolean;
  lastExecuted?: Date;
  executionCount: number;
}

interface RuleCardProps {
  rule: Rule;
  onExecute: (ruleId: number) => void;
  onDisable: (ruleId: number) => void;
}

export const RuleCard: FC<RuleCardProps> = ({ rule, onExecute, onDisable }) => {
  const typeIcons = {
    balance: '💰',
    price: '📈',
    schedule: '⏰',
    compliance: '🔒',
  };

  const typeColors = {
    balance: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    price: 'bg-green-500/20 text-green-400 border-green-500/50',
    schedule: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    compliance: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 hover:border-primary-500 transition">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">{typeIcons[rule.type]}</span>
          <div>
            <h3 className="text-white font-semibold text-lg">{rule.name}</h3>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border mt-1 ${typeColors[rule.type]}`}>
              {rule.type.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-block w-2 h-2 rounded-full ${rule.isActive ? 'bg-success animate-pulse' : 'bg-slate-600'}`}></span>
          <span className="text-slate-400 text-sm">{rule.isActive ? 'Active' : 'Disabled'}</span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-start">
          <span className="text-slate-400 text-sm mr-2">IF:</span>
          <span className="text-slate-200 text-sm">{rule.condition}</span>
        </div>
        <div className="flex items-start">
          <span className="text-slate-400 text-sm mr-2">THEN:</span>
          <span className="text-slate-200 text-sm">{rule.action}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-700">
        <div className="text-sm text-slate-400">
          <span>Executed: </span>
          <span className="text-white font-medium">{rule.executionCount}x</span>
          {rule.lastExecuted && (
            <span className="ml-2">
              Last: {new Date(rule.lastExecuted).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          {rule.isActive && (
            <button
              onClick={() => onExecute(rule.id)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition"
            >
              Execute Now
            </button>
          )}
          <button
            onClick={() => onDisable(rule.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              rule.isActive
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-success hover:bg-success/80 text-white'
            }`}
          >
            {rule.isActive ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>
    </div>
  );
};
