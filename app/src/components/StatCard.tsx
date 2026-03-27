import { FC } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  change?: string;
  trend?: 'up' | 'down';
}

export const StatCard: FC<StatCardProps> = ({ title, value, icon, change, trend }) => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 hover:border-primary-500 transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <h3 className="text-white text-3xl font-bold mt-2">{value}</h3>
          {change && (
            <p className={`text-sm mt-2 ${trend === 'up' ? 'text-success' : 'text-danger'}`}>
              {trend === 'up' ? '↑' : '↓'} {change}
            </p>
          )}
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
};
