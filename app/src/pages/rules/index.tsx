import { useWallet } from '@solana/wallet-adapter-react';
import Head from 'next/head';
import { Layout } from '../../components/Layout';
import { RuleCard, Rule } from '../../components/RuleCard';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Rules() {
  const { connected } = useWallet();
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => {
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
        {
          id: 5,
          name: 'Emergency SOL Swap',
          type: 'balance',
          condition: 'SOL balance < 10,000 SOL',
          action: 'Convert $500k USDC → SOL',
          isActive: false,
          lastExecuted: new Date(Date.now() - 86400000 * 30),
          executionCount: 3,
        },
      ];
      setRules(mockRules);
    }
  }, [connected]);

  const handleExecuteRule = async (ruleId: number) => {
    // Mock execution
    setTimeout(() => {
      setRules(prev =>
        prev.map(rule =>
          rule.id === ruleId
            ? { ...rule, executionCount: rule.executionCount + 1, lastExecuted: new Date() }
            : rule
        )
      );
      alert(`Rule #${ruleId} executed successfully!`);
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
