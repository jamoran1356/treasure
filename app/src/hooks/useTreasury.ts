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
  PROGRAM_ID,
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

  const [treasury, setTreasury] = useState<TreasuryData>(EMPTY_TREASURY);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!wallet.publicKey) {
      setTreasury(EMPTY_TREASURY);
      setRules([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const program = getProgram(wallet, connection);
      if (!program) throw new Error('Wallet not ready');

      const [treasuryPDA] = getTreasuryPDA(wallet.publicKey);

      // Fetch treasury account
      let treasuryAccount: TreasuryAccount | null = null;
      let exists = false;
      try {
        treasuryAccount = await (program.account as any).treasury.fetch(treasuryPDA) as TreasuryAccount;
        exists = true;
      } catch {
        // Treasury not initialized yet — that's OK
        exists = false;
      }

      // Fetch SOL balance of the treasury PDA
      let solBalance = 0;
      try {
        const lamports = await connection.getBalance(treasuryPDA);
        solBalance = lamports / LAMPORTS_PER_SOL;
      } catch {
        solBalance = 0;
      }

      setTreasury({ pda: treasuryPDA, account: treasuryAccount, solBalance, exists });

      // Fetch all rules for this treasury
      if (exists && treasuryAccount) {
        const fetchedRules: Rule[] = [];
        for (let i = 0; i < treasuryAccount.rulesCount; i++) {
          try {
            const [rulePDA] = getRulePDA(treasuryPDA, i);
            const rawRule = await (program.account as any).rule.fetch(rulePDA);
            fetchedRules.push(mapOnChainRuleToUiRule({ publicKey: rulePDA, account: rawRule }));
          } catch {
            // Rule may have been deleted — skip
          }
        }
        setRules(fetchedRules);
      } else {
        setRules([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error fetching on-chain data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [wallet, connection]);

  // Auto-refresh when wallet connects/disconnects
  useEffect(() => {
    refresh();
  }, [wallet.publicKey, refresh]);

  const initializeTreasury = useCallback(async (name: string): Promise<string> => {
    const program = getProgram(wallet, connection);
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');

    const [treasuryPDA] = getTreasuryPDA(wallet.publicKey);
    const { SystemProgram } = await import('@solana/web3.js');

    const tx = await (program.methods as any)
      .initializeTreasury(name)
      .accounts({
        treasury: treasuryPDA,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await refresh();
    return tx;
  }, [wallet, connection, refresh]);

  const addRule = useCallback(async (params: AddRuleParams): Promise<string> => {
    const program = getProgram(wallet, connection);
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');
    if (!treasury.pda || !treasury.account) throw new Error('Treasury not initialized');

    const [rulePDA] = getRulePDA(treasury.pda, treasury.account.rulesCount);
    const { SystemProgram } = await import('@solana/web3.js');

    const tx = await (program.methods as any)
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
      .rpc();

    await refresh();
    return tx;
  }, [wallet, connection, treasury, refresh]);

  const executeRule = useCallback(async (ruleId: number): Promise<string> => {
    const program = getProgram(wallet, connection);
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');
    if (!treasury.pda) throw new Error('Treasury not initialized');

    const [rulePDA] = getRulePDA(treasury.pda, ruleId);
    const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token');

    const tx = await (program.methods as any)
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
      .rpc();

    await refresh();
    return tx;
  }, [wallet, connection, treasury, refresh]);

  const disableRule = useCallback(async (ruleId: number): Promise<string> => {
    const program = getProgram(wallet, connection);
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');
    if (!treasury.pda) throw new Error('Treasury not initialized');

    const [rulePDA] = getRulePDA(treasury.pda, ruleId);

    const tx = await (program.methods as any)
      .disableRule()
      .accounts({
        treasury: treasury.pda,
        rule: rulePDA,
        authority: wallet.publicKey,
      })
      .rpc();

    await refresh();
    return tx;
  }, [wallet, connection, treasury, refresh]);

  return { treasury, rules, loading, error, refresh, initializeTreasury, addRule, executeRule, disableRule };
}
