import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Treasury } from "../target/types/treasury";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("treasury", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Treasury as Program<Treasury>;
  const authority = provider.wallet as anchor.Wallet;
  
  let treasuryPda: PublicKey;
  let treasuryBump: number;
  let mint: PublicKey;
  let sourceTokenAccount: PublicKey;
  let destTokenAccount: PublicKey;

  before(async () => {
    // Derive treasury PDA
    [treasuryPda, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), authority.publicKey.toBuffer()],
      program.programId
    );

    // Create mock USDC mint
    mint = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      6 // USDC decimals
    );

    // Create token accounts
    sourceTokenAccount = await createAccount(
      provider.connection,
      authority.payer,
      mint,
      treasuryPda
    );

    destTokenAccount = await createAccount(
      provider.connection,
      authority.payer,
      mint,
      authority.publicKey
    );

    // Mint tokens to source account
    await mintTo(
      provider.connection,
      authority.payer,
      mint,
      sourceTokenAccount,
      authority.publicKey,
      10_000_000_000 // 10,000 USDC
    );
  });

  describe("Security Tests", () => {
    it("Initializes treasury with correct authority", async () => {
      const treasuryName = "AMINA Bank Treasury";

      const tx = await program.methods
        .initializeTreasury(treasuryName)
        .accounts({
          treasury: treasuryPda,
          authority: authority.publicKey,
          payer: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
      
      assert.equal(treasuryAccount.authority.toString(), authority.publicKey.toString());
      assert.equal(treasuryAccount.name, treasuryName);
      assert.equal(treasuryAccount.rulesCount, 0);
    });

    it("Prevents name longer than 50 characters", async () => {
      const longName = "A".repeat(51); // 51 characters
      const fakeAuthority = Keypair.generate();
      
      const [fakeTreasuryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("treasury"), fakeAuthority.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .initializeTreasury(longName)
          .accounts({
            treasury: fakeTreasuryPda,
            authority: fakeAuthority.publicKey,
            payer: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fakeAuthority])
          .rpc();
        
        assert.fail("Should have failed with name too long error");
      } catch (error) {
        assert.include(error.toString(), "NameTooLong");
      }
    });

    it("Only authority can add rules", async () => {
      const [rulePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("rule"), treasuryPda.toBuffer(), Buffer.from([0, 0, 0, 0])],
        program.programId
      );

      const tx = await program.methods
        .addRule(
          { balanceBelowThreshold: {} },
          new anchor.BN(5_000_000_000), // 5,000 USDC
          { transfer: {} },
          new anchor.BN(1_000_000_000) // 1,000 USDC
        )
        .accounts({
          treasury: treasuryPda,
          rule: rulePda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const ruleAccount = await program.account.rule.fetch(rulePda);
      assert.equal(ruleAccount.isActive, true);
      assert.equal(ruleAccount.id, 0);
    });

    it("Prevents unauthorized user from adding rules", async () => {
      const unauthorizedUser = Keypair.generate();
      
      // Airdrop to unauthorized user
      await provider.connection.requestAirdrop(
        unauthorizedUser.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      
      // Wait for airdrop
      await new Promise(resolve => setTimeout(resolve, 1000));

      const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
      const [rulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("rule"),
          treasuryPda.toBuffer(),
          Buffer.from(new anchor.BN(treasuryAccount.rulesCount).toArray("le", 4))
        ],
        program.programId
      );

      try {
        await program.methods
          .addRule(
            { balanceBelowThreshold: {} },
            new anchor.BN(5_000_000_000),
            { transfer: {} },
            new anchor.BN(1_000_000_000)
          )
          .accounts({
            treasury: treasuryPda,
            rule: rulePda,
            authority: unauthorizedUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([unauthorizedUser])
          .rpc();

        assert.fail("Should have failed with unauthorized error");
      } catch (error) {
        assert.include(error.toString(), "Unauthorized");
      }
    });

    it("Prevents adding rule with zero amount", async () => {
      const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
      const [rulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("rule"),
          treasuryPda.toBuffer(),
          Buffer.from(new anchor.BN(treasuryAccount.rulesCount).toArray("le", 4))
        ],
        program.programId
      );

      try {
        await program.methods
          .addRule(
            { balanceBelowThreshold: {} },
            new anchor.BN(5_000_000_000),
            { transfer: {} },
            new anchor.BN(0) // Zero amount - INVALID
          )
          .accounts({
            treasury: treasuryPda,
            rule: rulePda,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        assert.fail("Should have failed with invalid amount error");
      } catch (error) {
        assert.include(error.toString(), "InvalidAmount");
      }
    });

    it("Executes rule when condition is met", async () => {
      // Get the first rule (id: 0)
      const [rulePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("rule"), treasuryPda.toBuffer(), Buffer.from([0, 0, 0, 0])],
        program.programId
      );

      const sourceBalanceBefore = await getAccount(
        provider.connection,
        sourceTokenAccount
      );

      const tx = await program.methods
        .executeRule(null) // No oracle price needed for balance threshold
        .accounts({
          treasury: treasuryPda,
          rule: rulePda,
          authority: authority.publicKey,
          executor: authority.publicKey,
          sourceTokenAccount: sourceTokenAccount,
          destinationTokenAccount: destTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      const sourceBalanceAfter = await getAccount(
        provider.connection,
        sourceTokenAccount
      );

      // Verify transfer occurred
      assert.isTrue(
        sourceBalanceAfter.amount < sourceBalanceBefore.amount,
        "Source balance should decrease"
      );

      const ruleAccount = await program.account.rule.fetch(rulePda);
      assert.equal(ruleAccount.executionCount, 1);
    });

    it("Prevents unauthorized execution of rules", async () => {
      const unauthorizedUser = Keypair.generate();
      
      await provider.connection.requestAirdrop(
        unauthorizedUser.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [rulePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("rule"), treasuryPda.toBuffer(), Buffer.from([0, 0, 0, 0])],
        program.programId
      );

      try {
        await program.methods
          .executeRule(null)
          .accounts({
            treasury: treasuryPda,
            rule: rulePda,
            authority: authority.publicKey,
            executor: unauthorizedUser.publicKey, // Unauthorized!
            sourceTokenAccount: sourceTokenAccount,
            destinationTokenAccount: destTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([unauthorizedUser])
          .rpc();

        assert.fail("Should have failed with unauthorized error");
      } catch (error) {
        assert.include(error.toString(), "unknown signer");
      }
    });

    it("Prevents execution when condition is not met", async () => {
      // Create a rule with impossible condition
      const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
      const [rulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("rule"),
          treasuryPda.toBuffer(),
          Buffer.from(new anchor.BN(treasuryAccount.rulesCount).toArray("le", 4))
        ],
        program.programId
      );

      // Add rule with very high threshold (impossible to meet)
      await program.methods
        .addRule(
          { balanceBelowThreshold: {} },
          new anchor.BN(999_999_999_999_999), // Impossibly high
          { transfer: {} },
          new anchor.BN(1_000_000)
        )
        .accounts({
          treasury: treasuryPda,
          rule: rulePda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      try {
        await program.methods
          .executeRule(null)
          .accounts({
            treasury: treasuryPda,
            rule: rulePda,
            authority: authority.publicKey,
            executor: authority.publicKey,
            sourceTokenAccount: sourceTokenAccount,
            destinationTokenAccount: destTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();

        assert.fail("Should have failed with condition not met error");
      } catch (error) {
        assert.include(error.toString(), "ConditionNotMet");
      }
    });

    it("Only authority can disable rules", async () => {
      const [rulePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("rule"), treasuryPda.toBuffer(), Buffer.from([0, 0, 0, 0])],
        program.programId
      );

      const tx = await program.methods
        .disableRule()
        .accounts({
          treasury: treasuryPda,
          rule: rulePda,
          authority: authority.publicKey,
        })
        .rpc();

      const ruleAccount = await program.account.rule.fetch(rulePda);
      assert.equal(ruleAccount.isActive, false);
    });

    it("Prevents unauthorized user from disabling rules", async () => {
      const unauthorizedUser = Keypair.generate();
      
      await provider.connection.requestAirdrop(
        unauthorizedUser.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [rulePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("rule"), treasuryPda.toBuffer(), Buffer.from([0, 0, 0, 0])],
        program.programId
      );

      try {
        await program.methods
          .disableRule()
          .accounts({
            treasury: treasuryPda,
            rule: rulePda,
            authority: unauthorizedUser.publicKey,
          })
          .signers([unauthorizedUser])
          .rpc();

        assert.fail("Should have failed with unauthorized error");
      } catch (error) {
        assert.include(error.toString(), "Unauthorized");
      }
    });

    it("Prevents execution of disabled rule", async () => {
      const [rulePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("rule"), treasuryPda.toBuffer(), Buffer.from([0, 0, 0, 0])],
        program.programId
      );

      try {
        await program.methods
          .executeRule(null)
          .accounts({
            treasury: treasuryPda,
            rule: rulePda,
            authority: authority.publicKey,
            executor: authority.publicKey,
            sourceTokenAccount: sourceTokenAccount,
            destinationTokenAccount: destTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();

        assert.fail("Should have failed with rule not active error");
      } catch (error) {
        assert.include(error.toString(), "RuleNotActive");
      }
    });
  });

  describe("Functional Tests", () => {
    it("Tests price-based rule with oracle data", async () => {
      const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
      const [rulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("rule"),
          treasuryPda.toBuffer(),
          Buffer.from(new anchor.BN(treasuryAccount.rulesCount).toArray("le", 4))
        ],
        program.programId
      );

      // Add price-based rule
      await program.methods
        .addRule(
          { priceAboveThreshold: {} },
          new anchor.BN(2100), // Gold price > $2100
          { swap: {} },
          new anchor.BN(500_000_000)
        )
        .accounts({
          treasury: treasuryPda,
          rule: rulePda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Execute with mock oracle price
      const tx = await program.methods
        .executeRule(new anchor.BN(2150)) // Price is $2150
        .accounts({
          treasury: treasuryPda,
          rule: rulePda,
          authority: authority.publicKey,
          executor: authority.publicKey,
          sourceTokenAccount: sourceTokenAccount,
          destinationTokenAccount: destTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      const ruleAccount = await program.account.rule.fetch(rulePda);
      assert.equal(ruleAccount.executionCount, 1);
    });

    it("Tests compliance gate blocking", async () => {
      const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
      const [rulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("rule"),
          treasuryPda.toBuffer(),
          Buffer.from(new anchor.BN(treasuryAccount.rulesCount).toArray("le", 4))
        ],
        program.programId
      );

      // Add compliance gate rule that blocks
      await program.methods
        .addRule(
          { complianceGate: {} },
          new anchor.BN(0),
          { blockPayment: {} }, // This action blocks
          new anchor.BN(100_000)
        )
        .accounts({
          treasury: treasuryPda,
          rule: rulePda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      try {
        await program.methods
          .executeRule(null)
          .accounts({
            treasury: treasuryPda,
            rule: rulePda,
            authority: authority.publicKey,
            executor: authority.publicKey,
            sourceTokenAccount: sourceTokenAccount,
            destinationTokenAccount: destTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();

        assert.fail("Should have been blocked by compliance check");
      } catch (error) {
        assert.include(error.toString(), "ComplianceCheckFailed");
      }
    });
  });
});
