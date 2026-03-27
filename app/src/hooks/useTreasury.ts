import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import {
  getProgram,
  getTreasuryPDA,
  getRulePDA,
  ruleTypeToString,
  actionToString,
  TreasuryAccount,
  RuleAccount,
} from '../utils/program';
import { Rule } from '../components/RuleCard';

export interface TreasuryData {
  pda: PublicKey | null;
  account: TreasuryAccount | null;
  solBalance: number;
  exists: boolean;
}

export interface UseTreasuryResult {
  treasury: TreasuryData;
  rules: Rule[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  initializeTreasury: (name: string) => Promise<string>;
  addRule: (params: AddRuleParams) => Promise<string>;
  executeRule: (ruleId: number) => Promise<string>;
  disableRule: (ruleId: number) => Promise<string>;
}

export interface AddRuleParams {
  ruleType: 'balance' | 'price' | 'schedule' | 'compliance';
  conditionValue: number;
  action: 'transfer' | 'swap' | 'blockPayment';
  targetAmount: number;
}

const EMPTY_TREASURY: TreasuryData = {
  pda: null,
  account: null,
  solBalance: 0,
  exists: false,
};

const RETRY_DELAYS_MS = [500, 1500, 3000];
const AUTO_SYNC_INTERVAL_MS = 20000;

interface CachedTreasuryState {
  updatedAt: number;
  treasury: {
    pda: string | null;
    account: {
      authority: string;
      name: string;
      rulesCount: number;
      totalValue: string;
      bump: number;
    } | null;
    solBalance: number;
    exists: boolean;
  };
  rules: Array<{
    id: number;
    name: string;
    type: 'balance' | 'price' | 'schedule' | 'compliance';
    condition: string;
    action: string;
    isActive: boolean;
    lastExecuted?: string;
    executionCount: number;
  }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isAccountNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const normalized = msg.toLowerCase();
  return (
    normalized.includes('account not found')
    || normalized.includes('account does not exist')
    || normalized.includes('could not find account')
    || normalized.includes('has no data')
  );
}

function isLikelyTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const normalized = msg.toLowerCase();
  return (
    normalized.includes('fetch failed')
    || normalized.includes('429')
    || normalized.includes('timed out')
    || normalized.includes('timeout')
    || normalized.includes('blockhash not found')
    || normalized.includes('node is behind')
    || normalized.includes('connection')
    || normalized.includes('network')
  );
}

async function withRetry<T>(fn: () => Promise<T>, attempts = RETRY_DELAYS_MS.length + 1): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const canRetry = i < attempts - 1 && isLikelyTransientError(err);
      if (!canRetry) break;
      await sleep(RETRY_DELAYS_MS[i] ?? 3000);
    }
  }

  throw lastError;
}

function getClusterLabel(rpcEndpoint: string): 'devnet' | 'mainnet-beta' {
  return rpcEndpoint.toLowerCase().includes('mainnet') ? 'mainnet-beta' : 'devnet';
}

function serializeRulesForCache(rules: Rule[]): CachedTreasuryState['rules'] {
  return rules.map(rule => ({
    ...rule,
    lastExecuted: rule.lastExecuted ? rule.lastExecuted.toISOString() : undefined,
  }));
}

function deserializeRulesFromCache(cachedRules: CachedTreasuryState['rules']): Rule[] {
  return cachedRules.map(rule => ({
    ...rule,
    lastExecuted: rule.lastExecuted ? new Date(rule.lastExecuted) : undefined,
  }));
}

function mapCachedTreasuryToState(cached: CachedTreasuryState): TreasuryData {
  return {
    pda: cached.treasury.pda ? new PublicKey(cached.treasury.pda) : null,
    account: cached.treasury.account
      ? {
          authority: new PublicKey(cached.treasury.account.authority),
          name: cached.treasury.account.name,
          rulesCount: cached.treasury.account.rulesCount,
          totalValue: new BN(cached.treasury.account.totalValue),
          bump: cached.treasury.account.bump,
        }
      : null,
    solBalance: cached.treasury.solBalance,
    exists: cached.treasury.exists,
  };
}

function mapRuleTypeToAnchor(rt: AddRuleParams['ruleType']) {
  const map = {
    balance: { balanceBelowThreshold: {} },
    price: { priceAboveThreshold: {} },
    schedule: { scheduledExecution: {} },
    compliance: { complianceGate: {} },
  };
  return map[rt];
}

function mapActionToAnchor(action: AddRuleParams['action']) {
  const map = {
    transfer: { transfer: {} },
    swap: { swap: {} },
    blockPayment: { blockPayment: {} },
  };
  return map[action];
}

function mapOnChainRuleToUiRule(raw: RuleAccount): Rule {
  return {
    id: raw.account.id,
    name: `Rule #${raw.account.id}`,
    type: ruleTypeToString(raw.account.ruleType),
    condition: `Threshold: ${raw.account.conditionValue.toString()}`,
    action: actionToString(raw.account.action),
    isActive: raw.account.isActive,
    lastExecuted: raw.account.lastExecuted.gt(new BN(0))
      ? new Date(raw.account.lastExecuted.toNumber() * 1000)
      : undefined,
    executionCount: raw.account.executionCount.toNumber(),
  };
}

export function useTreasury(): UseTreasuryResult {
  const { connection } = useConnection();
  const wallet = useWallet();
  const clusterLabel = getClusterLabel(connection.rpcEndpoint);

  const [treasury, setTreasury] = useState<TreasuryData>(EMPTY_TREASURY);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCacheKey = useCallback(() => {
    if (!wallet.publicKey) return null;
    return `treasury-cache:${clusterLabel}:${wallet.publicKey.toBase58()}`;
  }, [wallet.publicKey, clusterLabel]);

  const persistState = useCallback((nextTreasury: TreasuryData, nextRules: Rule[]) => {
    if (typeof window === 'undefined') return;
    const key = getCacheKey();
    if (!key) return;

    const payload: CachedTreasuryState = {
      updatedAt: Date.now(),
      treasury: {
        pda: nextTreasury.pda ? nextTreasury.pda.toBase58() : null,
        account: nextTreasury.account
          ? {
              authority: nextTreasury.account.authority.toBase58(),
              name: nextTreasury.account.name,
              rulesCount: nextTreasury.account.rulesCount,
              totalValue: nextTreasury.account.totalValue.toString(),
              bump: nextTreasury.account.bump,
            }
          : null,
        solBalance: nextTreasury.solBalance,
        exists: nextTreasury.exists,
      },
      rules: serializeRulesForCache(nextRules),
    };

    window.localStorage.setItem(key, JSON.stringify(payload));
  }, [getCacheKey]);

  const restoreCachedState = useCallback(() => {
    if (typeof window === 'undefined') return;
    const key = getCacheKey();
    if (!key) return;

    const raw = window.localStorage.getItem(key);
    if (!raw) return;

    try {
      const cached = JSON.parse(raw) as CachedTreasuryState;
      setTreasury(mapCachedTreasuryToState(cached));
      setRules(deserializeRulesFromCache(cached.rules));
    } catch {
      window.localStorage.removeItem(key);
    }
  }, [getCacheKey]);

  const syncTreasury = useCallback(async (silent = false) => {
    if (!wallet.publicKey) {
      setTreasury(EMPTY_TREASURY);
      setRules([]);
      setError(null);
      return;
    }

    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const program = getProgram(wallet, connection);
      if (!program) throw new Error('Wallet not ready');

      const [treasuryPDA] = getTreasuryPDA(wallet.publicKey);

      // Fetch treasury account
      let treasuryAccount: TreasuryAccount | null = null;
      let exists = false;
      try {
        treasuryAccount = await withRetry(
          () => (program.account as any).treasury.fetch(treasuryPDA) as Promise<TreasuryAccount>
        );
        exists = true;
      } catch (err: unknown) {
        if (!isAccountNotFoundError(err)) {
          throw err;
        }
        // Treasury not initialized yet — that's OK
        exists = false;
      }

      // Fetch SOL balance of the treasury PDA
      let solBalance = 0;
      try {
        const lamports = await withRetry(() => connection.getBalance(treasuryPDA));
        solBalance = lamports / LAMPORTS_PER_SOL;
      } catch {
        solBalance = 0;
      }

      const nextTreasury = { pda: treasuryPDA, account: treasuryAccount, solBalance, exists };
      setTreasury(nextTreasury);

      // Fetch all rules for this treasury
      if (exists && treasuryAccount) {
        const fetchedRules: Rule[] = [];
        for (let i = 0; i < treasuryAccount.rulesCount; i++) {
          try {
            const [rulePDA] = getRulePDA(treasuryPDA, i);
            const rawRule = await withRetry(
              () => (program.account as any).rule.fetch(rulePDA) as Promise<RuleAccount['account']>,
              2
            );
            fetchedRules.push(mapOnChainRuleToUiRule({ publicKey: rulePDA, account: rawRule }));
          } catch (err: unknown) {
            if (!isAccountNotFoundError(err)) {
              throw err;
            }
            // Rule may have been deleted — skip
          }
        }
        setRules(fetchedRules);
        persistState(nextTreasury, fetchedRules);
      } else {
        setRules([]);
        persistState(nextTreasury, []);
      }

      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error fetching on-chain data';
      setError(`Sync error: ${msg}. Reintentando en segundo plano.`);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [wallet, connection, persistState]);

  const refresh = useCallback(async () => {
    await syncTreasury(false);
  }, [syncTreasury]);

  // Restore last known state and then sync when wallet changes.
  useEffect(() => {
    restoreCachedState();
    void syncTreasury(true);
  }, [wallet.publicKey, clusterLabel, restoreCachedState, syncTreasury]);

  // Periodic sync to avoid stale data without requiring manual refresh.
  useEffect(() => {
    if (!wallet.publicKey) return;

    const intervalId = setInterval(() => {
      void syncTreasury(true);
    }, AUTO_SYNC_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [wallet.publicKey, syncTreasury]);

  // Sync on tab focus to recover quickly after temporary network issues.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onFocus = () => {
      void syncTreasury(true);
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [syncTreasury]);

  const initializeTreasury = useCallback(async (name: string): Promise<string> => {
    const program = getProgram(wallet, connection);
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');

    const [treasuryPDA] = getTreasuryPDA(wallet.publicKey);
    const { SystemProgram } = await import('@solana/web3.js');

    const tx = await withRetry<string>(() => (program.methods as any)
      .initializeTreasury(name)
      .accounts({
        treasury: treasuryPDA,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc());

    await syncTreasury(true);
    return tx;
  }, [wallet, connection, syncTreasury]);

  const addRule = useCallback(async (params: AddRuleParams): Promise<string> => {
    const program = getProgram(wallet, connection);
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');
    if (!treasury.pda || !treasury.account) throw new Error('Treasury not initialized');

    const [rulePDA] = getRulePDA(treasury.pda, treasury.account.rulesCount);
    const { SystemProgram } = await import('@solana/web3.js');

    const tx = await withRetry<string>(() => (program.methods as any)
      .addRule(
        mapRuleTypeToAnchor(params.ruleType),
        new BN(params.conditionValue),
        mapActionToAnchor(params.action),
        new BN(params.targetAmount)
      )
      .accounts({
        treasury: treasury.pda,
        rule: rulePDA,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc());

    await syncTreasury(true);
    return tx;
  }, [wallet, connection, treasury, syncTreasury]);

  const executeRule = useCallback(async (ruleId: number): Promise<string> => {
    const program = getProgram(wallet, connection);
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');
    if (!treasury.pda) throw new Error('Treasury not initialized');

    const [rulePDA] = getRulePDA(treasury.pda, ruleId);
    const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token');

    const tx = await withRetry<string>(() => (program.methods as any)
      .executeRule(null) // oracle_price: None for non-price rules
      .accounts({
        treasury: treasury.pda,
        rule: rulePDA,
        authority: wallet.publicKey,
        executor: wallet.publicKey,
        // For MVP demo these are placeholder — real app passes token accounts
        sourceTokenAccount: wallet.publicKey,
        destinationTokenAccount: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc());

    await syncTreasury(true);
    return tx;
  }, [wallet, connection, treasury, syncTreasury]);

  const disableRule = useCallback(async (ruleId: number): Promise<string> => {
    const program = getProgram(wallet, connection);
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');
    if (!treasury.pda) throw new Error('Treasury not initialized');

    const [rulePDA] = getRulePDA(treasury.pda, ruleId);

    const tx = await withRetry<string>(() => (program.methods as any)
      .disableRule()
      .accounts({
        treasury: treasury.pda,
        rule: rulePDA,
        authority: wallet.publicKey,
      })
      .rpc());

    await syncTreasury(true);
    return tx;
  }, [wallet, connection, treasury, syncTreasury]);

  return { treasury, rules, loading, error, refresh, initializeTreasury, addRule, executeRule, disableRule };
}
