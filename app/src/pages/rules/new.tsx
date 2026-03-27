import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Head from 'next/head';
import { Layout } from '../../components/Layout';
import Router from 'next/router';

export default function NewRule() {
  const { connected } = useWallet();
  const [ruleType, setRuleType] = useState<'balance' | 'price' | 'schedule' | 'compliance'>('balance');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Mock submission
    setTimeout(() => {
      setLoading(false);
      alert('Rule created successfully!\n\n(Mock creation - Connect smart contract for real txn)');
      Router.push('/');
    }, 1500);
  };

  if (!connected) {
    return (
      <Layout>
        <div className="text-center text-white mt-20">
          <p>Please connect your wallet to create rules</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Create New Rule - Programmable Treasury</title>
      </Head>

      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Create New Rule</h1>
          <p className="text-slate-400">Define automated treasury management logic</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700">
          {/* Rule Name */}
          <div className="mb-6">
            <label className="block text-white font-medium mb-2">Rule Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Rebalance USDC Reserve"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition"
            />
          </div>

          {/* Rule Type */}
          <div className="mb-6">
            <label className="block text-white font-medium mb-2">Rule Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: 'balance', label: 'Balance', icon: '💰' },
                { value: 'price', label: 'Price', icon: '📈' },
                { value: 'schedule', label: 'Schedule', icon: '⏰' },
                { value: 'compliance', label: 'Compliance', icon: '🔒' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setRuleType(type.value as any)}
                  className={`p-4 rounded-lg border-2 transition ${
                    ruleType === type.value
                      ? 'border-primary-500 bg-primary-500/20'
                      : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                  }`}
                >
                  <div className="text-3xl mb-2">{type.icon}</div>
                  <div className="text-white font-medium text-sm">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div className="mb-6">
            <label className="block text-white font-medium mb-2">Condition (IF...)</label>
            {ruleType === 'balance' && (
              <div className="space-y-3">
                <select className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-primary-500 outline-none">
                  <option>USDC balance</option>
                  <option>SOL balance</option>
                  <option>USDT balance</option>
                </select>
                <select className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-primary-500 outline-none">
                  <option value="below">is below</option>
                  <option value="above">is above</option>
                </select>
                <input
                  type="number"
                  required
                  placeholder="Amount (e.g., 5000000)"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-primary-500 outline-none"
                />
              </div>
            )}
            {ruleType === 'price' && (
              <div className="space-y-3">
                <select className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-primary-500 outline-none">
                  <option>SOL/USD price</option>
                  <option>Gold price (SIX)</option>
                  <option>BTC/USD price</option>
                </select>
                <select className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-primary-500 outline-none">
                  <option value="above">is above</option>
                  <option value="below">is below</option>
                </select>
                <input
                  type="number"
                  required
                  placeholder="Price threshold (e.g., 2100)"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-primary-500 outline-none"
                />
              </div>
            )}
            {ruleType === 'schedule' && (
              <div className="space-y-3">
                <select className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-primary-500 outline-none">
                  <option>Every day at...</option>
                  <option>Every Friday at...</option>
                  <option>First day of month at...</option>
                </select>
                <input
                  type="time"
                  required
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-primary-500 outline-none"
                />
              </div>
            )}
            {ruleType === 'compliance' && (
              <div className="space-y-3">
                <select className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-primary-500 outline-none">
                  <option>Payment amount</option>
                  <option>Recipient address</option>
                </select>
                <select className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-primary-500 outline-none">
                  <option value="above">is above</option>
                  <option value="equals">equals</option>
                </select>
                <input
                  type="number"
                  required
                  placeholder="Threshold (e.g., 100000)"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-primary-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Action */}
          <div className="mb-6">
            <label className="block text-white font-medium mb-2">Action (THEN...)</label>
            <div className="space-y-3">
              <select className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-primary-500 outline-none">
                <option>Transfer tokens</option>
                <option>Swap tokens</option>
                <option>Block payment</option>
                <option>Send notification</option>
              </select>
              <input
                type="number"
                required
                placeholder="Amount"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-primary-500 outline-none"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-600 text-white font-medium rounded-lg transition"
            >
              {loading ? 'Creating...' : 'Create Rule'}
            </button>
            <button
              type="button"
              onClick={() => Router.push('/')}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
