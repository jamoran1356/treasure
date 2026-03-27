import { useWallet } from '@solana/wallet-adapter-react';
import Head from 'next/head';
import { Layout } from '../../components/Layout';
import { RuleCard } from '../../components/RuleCard';
import Link from 'next/link';
import { useTreasury } from '../../hooks/useTreasury';
import { useToast } from '../../contexts/ToastContext';

export default function Rules() {
  const { connected } = useWallet();
  const { rules, loading, error, executeRule, disableRule } = useTreasury();
  const { showToast } = useToast();

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
        <div className="text-center text-white mt-20">
          <p>Please connect your wallet to view and manage rules</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>All Rules - Programmable Treasury</title>
      </Head>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Treasury Rules</h1>
            <p className="text-slate-400">Manage automated treasury management rules</p>
          </div>
          <Link
            href="/rules/new"
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition"
          >
            + Add New Rule
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading && (
          <div className="col-span-2 text-center text-slate-400 py-12">Loading rules from chain...</div>
        )}
        {error && (
          <div className="col-span-2 bg-red-900/40 border border-red-500 rounded-xl p-4 text-red-300 text-sm">⚠ {error}</div>
        )}
        {rules.map(rule => (
          <RuleCard
            key={rule.id}
            rule={rule}
            onExecute={handleExecuteRule}
            onDisable={handleDisableRule}
          />
        ))}
      </div>

      {rules.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-white text-xl font-semibold mb-2">No rules yet</h3>
          <p className="text-slate-400 mb-6">Create your first automated treasury rule</p>
          <Link
            href="/rules/new"
            className="inline-block px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition"
          >
            Create Rule
          </Link>
        </div>
      )}
    </Layout>
  );
}
