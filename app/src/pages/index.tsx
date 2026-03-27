import { useWallet } from '@solana/wallet-adapter-react';
import Head from 'next/head';
import Image from 'next/image';
import { Layout } from '../components/Layout';
import { StatCard } from '../components/StatCard';
import { RuleCard } from '../components/RuleCard';
import Link from 'next/link';
import { useTreasury } from '../hooks/useTreasury';
import { useToast } from '../contexts/ToastContext';

export default function Home() {
  const { connected } = useWallet();
  const { treasury, rules, loading, error, executeRule, disableRule, initializeTreasury } = useTreasury();
  const { showToast } = useToast();

  const totalRules = rules.length;
  const activeRules = rules.filter(r => r.isActive).length;
  const recentActivity = rules
    .filter(r => r.lastExecuted)
    .sort((a, b) => (b.lastExecuted?.getTime() ?? 0) - (a.lastExecuted?.getTime() ?? 0))
    .slice(0, 4)
    .map(rule => ({
      action: `${rule.name} executed`,
      time: rule.lastExecuted?.toLocaleString() ?? 'Unknown time',
      status: 'success' as const,
    }));

  const balanceRules = rules.filter(r => r.type === 'balance').length;
  const priceRules = rules.filter(r => r.type === 'price').length;
  const complianceRules = rules.filter(r => r.type === 'compliance');
  const activeComplianceRules = complianceRules.filter(r => r.isActive).length;
  const complianceStatus = (() => {
    if (error) return 'Sync error';
    if (!treasury.exists) return 'Not initialized';
    if (complianceRules.length === 0) return 'No policy';
    if (activeComplianceRules === complianceRules.length) return 'Enforced';
    return `Partial (${activeComplianceRules}/${complianceRules.length})`;
  })();
  const complianceOrScheduleRules = rules.filter(r => r.type === 'compliance' || r.type === 'schedule').length;
  const safeTotalForPercent = Math.max(totalRules, 1);

  const handleExecuteRule = async (ruleId: number) => {
    try {
      const tx = await executeRule(ruleId);
      showToast('success', `Rule #${ruleId} executed!`, undefined, tx);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Execution failed', msg);
    }
  };

  const handleDisableRule = async (ruleId: number) => {
    try {
      await disableRule(ruleId);
      showToast('success', `Rule #${ruleId} disabled`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Failed to disable rule', msg);
    }
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
          value={treasury.account ? `${treasury.solBalance.toFixed(2)} SOL` : '—'}
          icon="💎"
          change=""
          trend="up"
        />
        <StatCard
          title="Active Rules"
          value={activeRules.toString()}
          icon="⚡"
        />
        <StatCard
          title="Executions Today"
          value={rules.reduce((sum, r) => sum + r.executionCount, 0).toString()}
          icon="✅"
          change=""
          trend="up"
        />
        <StatCard
          title="Compliance Status"
          value={complianceStatus}
          icon="🔒"
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-900/40 border border-red-500 rounded-xl p-4 mb-6 text-red-300 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Treasury not initialized */}
      {!treasury.exists && !loading && (
        <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-6 mb-8 text-center">
          <p className="text-slate-300 mb-4">No treasury found for this wallet. Initialize one to get started.</p>
          <button
            onClick={async () => {
              try {
                await initializeTreasury('My Treasury');
                showToast('success', 'Treasury initialized!');
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                showToast('error', 'Failed to initialize treasury', msg);
              }
            }}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition"
          >
            Initialize Treasury
          </button>
        </div>
      )}

      {/* On-chain Configuration Breakdown */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-8">
        <h2 className="text-white text-xl font-semibold mb-4">On-chain Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Balance Rules</span>
              <span className="text-success text-sm">{Math.round((balanceRules / safeTotalForPercent) * 100)}%</span>
            </div>
            <div className="text-white text-2xl font-bold">{balanceRules}</div>
            <div className="w-full bg-slate-700 h-2 rounded-full mt-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.round((balanceRules / safeTotalForPercent) * 100)}%` }}></div>
            </div>
          </div>
          
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Price Rules</span>
              <span className="text-success text-sm">{Math.round((priceRules / safeTotalForPercent) * 100)}%</span>
            </div>
            <div className="text-white text-2xl font-bold">{priceRules}</div>
            <div className="w-full bg-slate-700 h-2 rounded-full mt-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.round((priceRules / safeTotalForPercent) * 100)}%` }}></div>
            </div>
          </div>
          
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Compliance/Schedule</span>
              <span className="text-success text-sm">{Math.round((complianceOrScheduleRules / safeTotalForPercent) * 100)}%</span>
            </div>
            <div className="text-white text-2xl font-bold">{complianceOrScheduleRules}</div>
            <div className="w-full bg-slate-700 h-2 rounded-full mt-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.round((complianceOrScheduleRules / safeTotalForPercent) * 100)}%` }}></div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-400">
          {treasury.exists ? `Treasury PDA: ${treasury.pda?.toBase58()}` : 'Initialize your treasury to start tracking real on-chain activity.'}
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
        {recentActivity.length === 0 ? (
          <p className="text-slate-400 text-sm">No on-chain executions yet. Run a rule to see activity here.</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-700 last:border-0">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${activity.status === 'success' ? 'bg-success' : 'bg-warning'}`}></div>
                  <span className="text-slate-200">{activity.action}</span>
                </div>
                <span className="text-slate-400 text-sm">{activity.time}</span>
              </div>
            ))}
          </div>
        )}
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
