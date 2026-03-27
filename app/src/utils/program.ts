import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, Idl, BN } from '@coral-xyz/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';

export const PROGRAM_ID = new PublicKey('7Xbv2NquyJF6tmgoRweogf1LbXmnXpqD5hdwvCdpbeu8');

// IDL in Anchor v2 format (anchor 0.30+): writable/signer instead of isMut/isSigner
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const IDL: any = {
  version: '0.1.0',
  name: 'treasury',
  address: '7Xbv2NquyJF6tmgoRweogf1LbXmnXpqD5hdwvCdpbeu8',
  metadata: { name: 'treasury', version: '0.1.0', spec: '0.1.0' },
  instructions: [
    {
      name: 'initializeTreasury',
      accounts: [
        { name: 'treasury', writable: true, signer: false, pda: { seeds: [{ kind: 'const', value: [116,114,101,97,115,117,114,121] }, { kind: 'account', path: 'authority' }] } },
        { name: 'authority', writable: false, signer: true },
        { name: 'payer', writable: true, signer: true },
        { name: 'systemProgram', writable: false, signer: false },
      ],
      args: [{ name: 'name', type: 'string' }],
    },
    {
      name: 'addRule',
      accounts: [
        { name: 'treasury', writable: true, signer: false },
        { name: 'rule', writable: true, signer: false },
        { name: 'authority', writable: true, signer: true },
        { name: 'systemProgram', writable: false, signer: false },
      ],
      args: [
        { name: 'ruleType', type: { defined: { name: 'RuleType' } } },
        { name: 'conditionValue', type: 'u64' },
        { name: 'action', type: { defined: { name: 'Action' } } },
        { name: 'targetAmount', type: 'u64' },
      ],
    },
    {
      name: 'executeRule',
      accounts: [
        { name: 'treasury', writable: false, signer: false },
        { name: 'rule', writable: true, signer: false },
        { name: 'authority', writable: false, signer: true },
        { name: 'executor', writable: false, signer: true },
        { name: 'sourceTokenAccount', writable: true, signer: false },
        { name: 'destinationTokenAccount', writable: true, signer: false },
        { name: 'tokenProgram', writable: false, signer: false },
      ],
      args: [{ name: 'oraclePrice', type: { option: 'u64' } }],
    },
    {
      name: 'disableRule',
      accounts: [
        { name: 'treasury', writable: false, signer: false },
        { name: 'rule', writable: true, signer: false },
        { name: 'authority', writable: false, signer: true },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: 'Treasury',
      discriminator: [0, 0, 0, 0, 0, 0, 0, 0],
      type: {
        kind: 'struct',
        fields: [
          { name: 'authority', type: 'publicKey' },
          { name: 'name', type: 'string' },
          { name: 'rulesCount', type: 'u32' },
          { name: 'totalValue', type: 'u64' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
    {
      name: 'Rule',
      discriminator: [0, 0, 0, 0, 0, 0, 0, 1],
      type: {
        kind: 'struct',
        fields: [
          { name: 'treasury', type: 'publicKey' },
          { name: 'id', type: 'u32' },
          { name: 'ruleType', type: { defined: { name: 'RuleType' } } },
          { name: 'conditionValue', type: 'u64' },
          { name: 'action', type: { defined: { name: 'Action' } } },
          { name: 'targetAmount', type: 'u64' },
          { name: 'isActive', type: 'bool' },
          { name: 'lastExecuted', type: 'i64' },
          { name: 'executionCount', type: 'u64' },
        ],
      },
    },
  ],
  types: [
    {
      name: 'RuleType',
      type: {
        kind: 'enum',
        variants: [
          { name: 'BalanceBelowThreshold' },
          { name: 'PriceAboveThreshold' },
          { name: 'ScheduledExecution' },
          { name: 'ComplianceGate' },
        ],
      },
    },
    {
      name: 'Action',
      type: {
        kind: 'enum',
        variants: [
          { name: 'Transfer' },
          { name: 'Swap' },
          { name: 'BlockPayment' },
        ],
      },
    },
  ],
  errors: [],
};

export type RuleTypeOnChain = 
  | { balanceBelowThreshold: Record<string, never> }
  | { priceAboveThreshold: Record<string, never> }
  | { scheduledExecution: Record<string, never> }
  | { complianceGate: Record<string, never> };

export type ActionOnChain =
  | { transfer: Record<string, never> }
  | { swap: Record<string, never> }
  | { blockPayment: Record<string, never> };

export interface TreasuryAccount {
  authority: PublicKey;
  name: string;
  rulesCount: number;
  totalValue: BN;
  bump: number;
}

export interface RuleAccount {
  publicKey: PublicKey;
  account: {
    treasury: PublicKey;
    id: number;
    ruleType: RuleTypeOnChain;
    conditionValue: BN;
    action: ActionOnChain;
    targetAmount: BN;
    isActive: boolean;
    lastExecuted: BN;
    executionCount: BN;
  };
}

export function getTreasuryPDA(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('treasury'), authority.toBuffer()],
    PROGRAM_ID
  );
}

export function getRulePDA(treasuryPDA: PublicKey, ruleIndex: number): [PublicKey, number] {
  const indexBytes = Buffer.alloc(4);
  indexBytes.writeUInt32LE(ruleIndex);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('rule'), treasuryPDA.toBuffer(), indexBytes],
    PROGRAM_ID
  );
}

export function getProgram(wallet: WalletContextState, connection: Connection): Program | null {
  if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return null;

  const provider = new AnchorProvider(
    connection,
    {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    },
    { commitment: 'confirmed' }
  );

  return new Program(IDL as Idl, provider);
}

export function ruleTypeToString(rt: RuleTypeOnChain): 'balance' | 'price' | 'schedule' | 'compliance' {
  if ('balanceBelowThreshold' in rt) return 'balance';
  if ('priceAboveThreshold' in rt) return 'price';
  if ('scheduledExecution' in rt) return 'schedule';
  return 'compliance';
}

export function actionToString(action: ActionOnChain): string {
  if ('transfer' in action) return 'Transfer tokens';
  if ('swap' in action) return 'Swap tokens';
  return 'Block payment';
}
