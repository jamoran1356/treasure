import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useMemo, useState } from 'react';
import bs58 from 'bs58';
import Head from 'next/head';
import { Layout } from '../components/Layout';
import { getTreasuryPDA, PROGRAM_ID } from '../utils/program';

interface HistoryItem {
  id: number;
  rule: string;
  action: string;
  amount: string;
  timestamp: Date;
  status: 'success' | 'failed';
  txHash: string;
}

const DISCRIMINATORS = {
  initializeTreasury: Uint8Array.from([124, 186, 211, 195, 85, 165, 129, 166]),
  addRule: Uint8Array.from([26, 241, 95, 174, 205, 5, 235, 77]),
  executeRule: Uint8Array.from([143, 36, 13, 104, 240, 240, 207, 192]),
  disableRule: Uint8Array.from([98, 20, 112, 62, 207, 167, 81, 99]),
};

function hasDiscriminator(data: Uint8Array, expected: Uint8Array): boolean {
  if (data.length < expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (data[i] !== expected[i]) return false;
  }
  return true;
}

function decodeActionFromTx(tx: any): { rule: string; action: string; amount: string } {
  const instructions = tx?.transaction?.message?.instructions ?? [];
  const programId = PROGRAM_ID.toBase58();

  for (const ix of instructions) {
    if (!('programId' in ix) || !('data' in ix)) continue;
    if (ix.programId.toBase58() !== programId) continue;

    let rawData: Uint8Array;
    try {
      rawData = bs58.decode(ix.data);
    } catch {
      continue;
    }

    if (hasDiscriminator(rawData, DISCRIMINATORS.initializeTreasury)) {
      return { rule: 'Treasury', action: 'Initialized treasury', amount: '-' };
    }
    if (hasDiscriminator(rawData, DISCRIMINATORS.addRule)) {
      return { rule: 'Rule', action: 'Created new rule', amount: '-' };
    }
    if (hasDiscriminator(rawData, DISCRIMINATORS.executeRule)) {
      return { rule: 'Rule', action: 'Executed rule', amount: 'On-chain action' };
    }
    if (hasDiscriminator(rawData, DISCRIMINATORS.disableRule)) {
      return { rule: 'Rule', action: 'Disabled rule', amount: '-' };
    }
  }

  return { rule: 'Treasury', action: 'Program interaction', amount: '-' };
}

export default function History() {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const treasuryPDA = useMemo(() => {
    if (!publicKey) return null;
    const [pda] = getTreasuryPDA(publicKey);
    return pda;
  }, [publicKey]);

  useEffect(() => {
    if (!connected || !publicKey || !treasuryPDA) {
      setHistory([]);
      setError(null);
      return;
    }

    const loadHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const signatures = await connection.getSignaturesForAddress(treasuryPDA, { limit: 25 });

        const txs = await Promise.all(
          signatures.map(sig =>
            connection.getParsedTransaction(sig.signature, {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0,
            })
          )
        );

        const items: HistoryItem[] = txs
          .map((tx, idx): HistoryItem | null => {
            if (!tx || !signatures[idx]) return null;
            const sig = signatures[idx];
            const decoded = decodeActionFromTx(tx);

            return {
              id: idx + 1,
              rule: decoded.rule,
              action: decoded.action,
              amount: decoded.amount,
              timestamp: new Date((sig.blockTime ?? Math.floor(Date.now() / 1000)) * 1000),
              status: sig.err ? 'failed' : 'success',
              txHash: sig.signature,
            };
          })
          .filter((item): item is HistoryItem => item !== null);

        setHistory(items);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error loading on-chain history';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    void loadHistory();
  }, [connected, publicKey, treasuryPDA, connection]);

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
        <p className="text-slate-400">Real on-chain interactions with your treasury program</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/50 bg-red-900/20 p-4 text-red-300 text-sm">
          Failed to load on-chain history: {error}
        </div>
      )}

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
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    Loading on-chain history...
                  </td>
                </tr>
              )}

              {!loading && history.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No on-chain history yet for this treasury.
                  </td>
                </tr>
              )}

              {history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/30 transition">
                  <td className="px-6 py-4 text-white font-medium">{item.rule}</td>
                  <td className="px-6 py-4 text-slate-300">{item.action}</td>
                  <td className="px-6 py-4 text-white font-mono">{item.amount}</td>
                  <td className="px-6 py-4 text-slate-400 text-sm">
                    {item.timestamp.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'success' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/50">
                        ✓ success
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/50">
                        ✕ failed
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`https://explorer.solana.com/tx/${item.txHash}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-400 hover:text-primary-300 font-mono text-sm transition"
                    >
                      {`${item.txHash.slice(0, 6)}...${item.txHash.slice(-4)}`} ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700 flex items-center justify-between">
          <div className="text-slate-400 text-sm">
            Showing {history.length} recent on-chain interactions
          </div>
        </div>
      </div>
    </Layout>
  );
}
