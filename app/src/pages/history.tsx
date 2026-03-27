import { useWallet } from '@solana/wallet-adapter-react';
import Head from 'next/head';
import { Layout } from '../components/Layout';

export default function History() {
  const { connected } = useWallet();

  const mockHistory = [
    {
      id: 1,
      rule: 'KYT Compliance Gate',
      action: 'Compliance check passed',
      amount: '$150,000 USDC',
      timestamp: new Date(Date.now() - 7200000),
      status: 'success',
      txHash: '5xG7...k9Qm',
    },
    {
      id: 2,
      rule: 'Weekly Dividend Payment',
      action: 'Distributed dividends',
      amount: '$3,010,000 USDC',
      timestamp: new Date(Date.now() - 259200000),
      status: 'success',
      txHash: '2jK8...pWn4',
    },
    {
      id: 3,
      rule: 'Rebalance USDC Reserve',
      action: 'Swapped SOL to USDC',
      amount: '$1,000,000',
      timestamp: new Date(Date.now() - 172800000),
      status: 'success',
      txHash: '9mN2...rTx7',
    },
    {
      id: 4,
      rule: 'Buy Gold RWA on Surge',
      action: 'Purchased gold bonds',
      amount: '$500,000',
      timestamp: new Date(Date.now() - 604800000),
      status: 'success',
      txHash: '4hL5...wYp3',
    },
  ];

  if (!connected) {
    return (
      <Layout>
        <div className="text-center text-white mt-20">
          <p>Please connect your wallet to view execution history</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Execution History - Programmable Treasury</title>
      </Head>

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Execution History</h1>
        <p className="text-slate-400">All automated rule executions and transactions</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Rule</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Action</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Time</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Transaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {mockHistory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/30 transition">
                  <td className="px-6 py-4 text-white font-medium">{item.rule}</td>
                  <td className="px-6 py-4 text-slate-300">{item.action}</td>
                  <td className="px-6 py-4 text-white font-mono">{item.amount}</td>
                  <td className="px-6 py-4 text-slate-400 text-sm">
                    {item.timestamp.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-success/20 text-success border border-success/50">
                      ✓ {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`https://explorer.solana.com/tx/${item.txHash}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-400 hover:text-primary-300 font-mono text-sm transition"
                    >
                      {item.txHash} ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700 flex items-center justify-between">
          <div className="text-slate-400 text-sm">
            Showing 4 of 189 total executions
          </div>
          <div className="flex space-x-2">
            <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition">
              Previous
            </button>
            <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition">
              Next
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
