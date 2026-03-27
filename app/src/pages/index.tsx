import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Head from 'next/head';
import Image from 'next/image';
import { Layout } from '../components/Layout';
import { StatCard } from '../components/StatCard';
import { RuleCard, Rule } from '../components/RuleCard';
import Link from 'next/link';

export default function Home() {
  const { connected } = useWallet();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Mock data for MVP demo
    if (connected) {
      const mockRules: Rule[] = [
        {
          id: 1,
          name: 'Rebalance USDC Reserve',
          type: 'balance',
          condition: 'USDC balance < $5,000,000',
          action: 'Convert $1M SOL → USDC',
          isActive: true,
          lastExecuted: new Date(Date.now() - 86400000 * 2),
          executionCount: 12,
        },
        {
          id: 2,
          name: 'Buy Gold RWA on Surge',
          type: 'price',
          condition: 'Gold price > $2,100/oz',
          action: 'Buy $500k gold bonds',
          isActive: true,
          lastExecuted: new Date(Date.now() - 86400000 * 7),
          executionCount: 5,
        },
        {
          id: 3,
          name: 'Weekly Dividend Payment',
          type: 'schedule',
          condition: 'Every Friday 5 PM UTC',
          action: 'Distribute 10% USDC to shareholders',
          isActive: true,
          lastExecuted: new Date(Date.now() - 86400000 * 3),
          executionCount: 24,
        },
        {
          id: 4,
          name: 'KYT Compliance Gate',
          type: 'compliance',
          condition: 'Payment amount > $100,000',
          action: 'Run Chainalysis KYT check',
          isActive: true,
          lastExecuted: new Date(Date.now() - 3600000),
          executionCount: 48,
        },
      ];
      setRules(mockRules);
    }
  }, [connected]);

  const handleExecuteRule = async (ruleId: number) => {
    setLoading(true);
    // Mock execution
    setTimeout(() => {
      setRules(prev =>
        prev.map(rule =>
          rule.id === ruleId
            ? { ...rule, executionCount: rule.executionCount + 1, lastExecuted: new Date() }
            : rule
        )
      );
      setLoading(false);
      alert(`Rule #${ruleId} executed successfully!\n\n(Mock execution - Connect smart contract for real txn)`);
    }, 1500);
  };

  const handleDisableRule = (ruleId: number) => {
    setRules(prev =>
      prev.map(rule =>
        rule.id === ruleId
          ? { ...rule, isActive: !rule.isActive }
          : rule
      )
    );
  };

  if (!connected) {
    return (
      <Layout>
        <Head>
          <title>Programmable Treasury - Automated Treasury Management</title>
        </Head>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-[300px] h-24 mx-auto mb-6 relative">
              <Image
                src="/assets/images/logo.webp"
                alt="Programmable Treasury Logo"
                fill
                sizes="300px"
                className="object-contain"
                priority
              />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Welcome to Programmable Treasury
            </h2>
            <p className="text-slate-400 mb-8 max-w-md">
              Institutional-grade automated treasury management on Solana.
              Connect your wallet to get started.
            </p>
            <div className="text-sm text-slate-500">
              <p>✓ Multi-token support (USDC, SOL, USDT)</p>
              <p>✓ Automated rule execution 24/7</p>
              <p>✓ KYT/AML compliance built-in</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Dashboard - Programmable Treasury</title>
      </Head>

      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Treasury Dashboard</h1>
        <p className="text-slate-400">AMINA Bank - Automated Treasury Management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Value Locked"
          value="$50.2M"
          icon="💎"
          change="+5.2%"
          trend="up"
        />
        <StatCard
          title="Active Rules"
          value={rules.filter(r => r.isActive).length.toString()}
          icon="⚡"
        />
        <StatCard
          title="Executions Today"
          value="14"
          icon="✅"
          change="+3"
          trend="up"
        />
        <StatCard
          title="Compliance Status"
          value="100%"
          icon="🔒"
        />
      </div>

      {/* Portfolio Breakdown */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-8">
        <h2 className="text-white text-xl font-semibold mb-4">Portfolio Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">USDC</span>
              <span className="text-success text-sm">60%</span>
            </div>
            <div className="text-white text-2xl font-bold">$30.1M</div>
            <div className="w-full bg-slate-700 h-2 rounded-full mt-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
          </div>
          
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">SOL</span>
              <span className="text-success text-sm">30%</span>
            </div>
            <div className="text-white text-2xl font-bold">$15.0M</div>
            <div className="w-full bg-slate-700 h-2 rounded-full mt-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: '30%' }}></div>
            </div>
          </div>
          
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">RWA Bonds</span>
              <span className="text-success text-sm">10%</span>
            </div>
            <div className="text-white text-2xl font-bold">$5.1M</div>
            <div className="w-full bg-slate-700 h-2 rounded-full mt-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '10%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Rules */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-2xl font-semibold">Active Rules</h2>
          <Link
            href="/rules/new"
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition"
          >
            + Add New Rule
          </Link>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {rules.slice(0, 4).map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onExecute={handleExecuteRule}
              onDisable={handleDisableRule}
            />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
        <h2 className="text-white text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[
            { action: 'Rule #4 executed', time: '2 hours ago', status: 'success' },
            { action: 'KYT check completed', time: '5 hours ago', status: 'success' },
            { action: 'Rule #3 executed', time: '1 day ago', status: 'success' },
            { action: 'Rule #1 executed', time: '2 days ago', status: 'success' },
          ].map((activity, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-slate-700 last:border-0">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${activity.status === 'success' ? 'bg-success' : 'bg-warning'}`}></div>
                <span className="text-slate-200">{activity.action}</span>
              </div>
              <span className="text-slate-400 text-sm">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 text-center">
            <div className="animate-spin text-4xl mb-4">⚡</div>
            <p className="text-white font-semibold">Executing rule...</p>
            <p className="text-slate-400 text-sm mt-2">Processing transaction on devnet</p>
          </div>
        </div>
      )}
    </Layout>
  );
}
