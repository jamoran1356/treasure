use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("58BCSjrmyjS2RDiEtSuq6deEhwefP3aa2AhvQ8wNHDEN");

#[program]
pub mod treasury {
    use super::*;

    /// Initialize a new treasury
    /// SECURITY: Only the signer can be the authority
    pub fn initialize_treasury(
        ctx: Context<InitializeTreasury>,
        name: String,
    ) -> Result<()> {
        require!(name.len() <= 50, TreasuryError::NameTooLong);
        
        let treasury = &mut ctx.accounts.treasury;
        treasury.authority = ctx.accounts.authority.key();
        treasury.name = name;
        treasury.bump = ctx.bumps.treasury;
        treasury.rules_count = 0;
        treasury.total_value = 0;

        emit!(TreasuryInitialized {
            treasury: treasury.key(),
            authority: treasury.authority,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Add a new rule to the treasury
    /// SECURITY: Only treasury authority can add rules
    pub fn add_rule(
        ctx: Context<AddRule>,
        rule_type: RuleType,
        condition_value: u64,
        action: Action,
        target_amount: u64,
    ) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        let rule = &mut ctx.accounts.rule;

        // SECURITY: Verify caller is treasury authority
        require!(
            treasury.authority == ctx.accounts.authority.key(),
            TreasuryError::Unauthorized
        );

        // SECURITY: Validate target amount is reasonable
        require!(target_amount > 0, TreasuryError::InvalidAmount);

        rule.treasury = treasury.key();
        rule.id = treasury.rules_count;
        rule.rule_type = rule_type;
        rule.condition_value = condition_value;
        rule.action = action;
        rule.target_amount = target_amount;
        rule.is_active = true;
        rule.last_executed = 0;
        rule.execution_count = 0;

        treasury.rules_count += 1;

        emit!(RuleAdded {
            treasury: treasury.key(),
            rule_id: rule.id,
            rule_type,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Execute a rule (auto-triggered or manual)
    /// SECURITY: Only treasury authority or automated systems can execute
    pub fn execute_rule(
        ctx: Context<ExecuteRule>,
        oracle_price: Option<u64>, // For PriceAboveThreshold rules
    ) -> Result<()> {
        let rule = &mut ctx.accounts.rule;
        let treasury = &ctx.accounts.treasury;
        let clock = Clock::get()?;

        // SECURITY: Verify caller is treasury authority
        require!(
            treasury.authority == ctx.accounts.executor.key(),
            TreasuryError::Unauthorized
        );

        // SECURITY: Check if rule is active
        require!(rule.is_active, TreasuryError::RuleNotActive);

        // SECURITY: Verify rule belongs to this treasury
        require!(
            rule.treasury == treasury.key(),
            TreasuryError::InvalidRule
        );

        // Check condition based on rule type
        match rule.rule_type {
            RuleType::BalanceBelowThreshold => {
                let source_account = &ctx.accounts.source_token_account;
                require!(
                    source_account.amount < rule.condition_value,
                    TreasuryError::ConditionNotMet
                );
            }
            RuleType::PriceAboveThreshold => {
                // SECURITY FIX: Use provided oracle price, not condition value
                let price = oracle_price.ok_or(TreasuryError::MissingOraclePrice)?;
                require!(
                    price > rule.condition_value,
                    TreasuryError::ConditionNotMet
                );
            }
            RuleType::ScheduledExecution => {
                // Check if enough time has passed since last execution
                let time_since_last = clock.unix_timestamp - rule.last_executed;
                require!(time_since_last > 86400, TreasuryError::ExecutionTooSoon); // 24h
            }
            RuleType::ComplianceGate => {
                // Compliance check (mock KYT for MVP)
                // In production, integrate with Chainalysis API
                msg!("Running KYT compliance check...");
                // For MVP, always pass. In production, this would check real KYT data
            }
        }

        // Execute action
        match rule.action {
            Action::Transfer => {
                // SECURITY: Verify sufficient balance
                let source_account = &ctx.accounts.source_token_account;
                require!(
                    source_account.amount >= rule.target_amount,
                    TreasuryError::InsufficientBalance
                );

                let authority_key = treasury.authority;
                let bump_seed = [treasury.bump];
                let signer_seeds: &[&[u8]] = &[
                    b"treasury",
                    authority_key.as_ref(),
                    &bump_seed,
                ];
                let signer = &[signer_seeds];

                let transfer_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.source_token_account.to_account_info(),
                        to: ctx.accounts.destination_token_account.to_account_info(),
                        authority: treasury.to_account_info(),
                    },
                    signer,
                );
                token::transfer(transfer_ctx, rule.target_amount)?;
            }
            Action::Swap => {
                // In MVP, we'll emit an event indicating a swap should happen
                // Real implementation would use a DEX aggregator
                msg!("Swap action: {} tokens", rule.target_amount);
            }
            Action::BlockPayment => {
                // Emit compliance block event and revert
                msg!("Payment blocked due to compliance check");
                return Err(TreasuryError::ComplianceCheckFailed.into());
            }
        }

        // Update rule execution tracking
        rule.last_executed = clock.unix_timestamp;
        rule.execution_count += 1;

        emit!(RuleExecuted {
            treasury: treasury.key(),
            rule_id: rule.id,
            action: rule.action.clone(),
            amount: rule.target_amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Disable a rule
    /// SECURITY: Only treasury authority can disable rules
    pub fn disable_rule(ctx: Context<DisableRule>) -> Result<()> {
        let rule = &mut ctx.accounts.rule;
        let treasury = &ctx.accounts.treasury;

        // SECURITY: Verify caller is treasury authority
        require!(
            treasury.authority == ctx.accounts.authority.key(),
            TreasuryError::Unauthorized
        );

        // SECURITY: Verify rule belongs to this treasury
        require!(
            rule.treasury == treasury.key(),
            TreasuryError::InvalidRule
        );

        rule.is_active = false;

        emit!(RuleDisabled {
            treasury: ctx.accounts.treasury.key(),
            rule_id: rule.id,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

// ============ ACCOUNT STRUCTURES ============

#[account]
pub struct Treasury {
    pub authority: Pubkey,
    pub name: String,
    pub rules_count: u32,
    pub total_value: u64,
    pub bump: u8,
}

#[account]
pub struct Rule {
    pub treasury: Pubkey,
    pub id: u32,
    pub rule_type: RuleType,
    pub condition_value: u64,
    pub action: Action,
    pub target_amount: u64,
    pub is_active: bool,
    pub last_executed: i64,
    pub execution_count: u64,
}

// ============ ENUMS ============

#[derive(Clone, Copy, AnchorSerialize, AnchorDeserialize, PartialEq)]
pub enum RuleType {
    BalanceBelowThreshold,
    PriceAboveThreshold,
    ScheduledExecution,
    ComplianceGate,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub enum Action {
    Transfer,
    Swap,
    BlockPayment,
}

// ============ CONTEXT STRUCTURES ============

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitializeTreasury<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 4 + 50 + 4 + 8 + 1, // discriminator + pubkey + u32 + string(50) + u32 + u64 + u8
        seeds = [b"treasury", authority.key().as_ref()],
        bump
    )]
    pub treasury: Account<'info, Treasury>,

    /// The authority that will control this treasury
    pub authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddRule<'info> {
    #[account(mut, has_one = authority @ TreasuryError::Unauthorized)]
    pub treasury: Account<'info, Treasury>,

    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 4 + 1 + 8 + 8 + 8 + 1 + 8 + 8 + 8, // Added padding
        seeds = [b"rule", treasury.key().as_ref(), &treasury.rules_count.to_le_bytes()],
        bump
    )]
    pub rule: Account<'info, Rule>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteRule<'info> {
    #[account(has_one = authority @ TreasuryError::Unauthorized)]
    pub treasury: Account<'info, Treasury>,

    #[account(
        mut,
        constraint = rule.treasury == treasury.key() @ TreasuryError::InvalidRule
    )]
    pub rule: Account<'info, Rule>,

    /// The authority of the treasury (must be signer)
    pub authority: Signer<'info>,

    /// Executor (same as authority for now)
    pub executor: Signer<'info>,

    #[account(mut)]
    pub source_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub destination_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DisableRule<'info> {
    #[account(has_one = authority @ TreasuryError::Unauthorized)]
    pub treasury: Account<'info, Treasury>,

    #[account(
        mut,
        constraint = rule.treasury == treasury.key() @ TreasuryError::InvalidRule
    )]
    pub rule: Account<'info, Rule>,

    pub authority: Signer<'info>,
}

// ============ EVENTS ============

#[event]
pub struct TreasuryInitialized {
    pub treasury: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RuleAdded {
    pub treasury: Pubkey,
    pub rule_id: u32,
    pub rule_type: RuleType,
    pub timestamp: i64,
}

#[event]
pub struct RuleExecuted {
    pub treasury: Pubkey,
    pub rule_id: u32,
    pub action: Action,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct RuleDisabled {
    pub treasury: Pubkey,
    pub rule_id: u32,
    pub timestamp: i64,
}

// ============ ERROR CODES ============

#[error_code]
pub enum TreasuryError {
    #[msg("Rule is not active")]
    RuleNotActive,

    #[msg("Rule condition not met")]
    ConditionNotMet,

    #[msg("Execution too soon - must wait cooldown period")]
    ExecutionTooSoon,

    #[msg("Compliance check failed - payment blocked")]
    ComplianceCheckFailed,

    #[msg("Unauthorized - caller is not treasury authority")]
    Unauthorized,

    #[msg("Invalid amount - must be greater than zero")]
    InvalidAmount,

    #[msg("Insufficient balance for this operation")]
    InsufficientBalance,

    #[msg("Missing oracle price for price-based rule")]
    MissingOraclePrice,

    #[msg("Invalid rule - does not belong to this treasury")]
    InvalidRule,

    #[msg("Name too long - maximum 50 characters")]
    NameTooLong,
}
