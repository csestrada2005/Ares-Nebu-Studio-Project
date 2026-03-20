import { SupabaseService } from './SupabaseService';

export class CreditService {
  /**
   * Check whether a user is allowed to make an AI call.
   * Rules:
   *  1. If free_prompt_used is false → allow ONE call (up to 100k tokens). Mark it used.
   *  2. If balance_credits > 0 → allow.
   *  3. Otherwise → block.
   */
  static async canMakeCall(
    userId: string
  ): Promise<{ allowed: boolean; reason?: string; isFreePrompt?: boolean }> {
    try {
      const supabase = SupabaseService.getInstance().client;

      const { data: wallet, error } = await supabase
        .from('forge_credit_wallets')
        .select('balance_credits, free_prompt_used')
        .eq('user_id', userId)
        .single();

      if (error || !wallet) {
        // No wallet row yet — treat as new user with free prompt available
        // Create a wallet row for them
        await supabase.from('forge_credit_wallets').upsert({
          user_id: userId,
          balance_credits: 0,
          free_prompt_used: false,
        });
        return { allowed: true, isFreePrompt: true };
      }

      if (!wallet.free_prompt_used) {
        return { allowed: true, isFreePrompt: true };
      }

      if ((wallet.balance_credits ?? 0) > 0) {
        return { allowed: true, isFreePrompt: false };
      }

      return { allowed: false, reason: 'insufficient_credits' };
    } catch (e) {
      console.error('[CreditService] canMakeCall error:', e);
      // Fail open — don't block users on DB errors
      return { allowed: true, isFreePrompt: false };
    }
  }

  /**
   * Mark the free prompt as used for a user.
   */
  static async markFreePromptUsed(userId: string): Promise<void> {
    try {
      const supabase = SupabaseService.getInstance().client;
      await supabase
        .from('forge_credit_wallets')
        .update({ free_prompt_used: true })
        .eq('user_id', userId);
    } catch (e) {
      console.error('[CreditService] markFreePromptUsed error:', e);
    }
  }

  /**
   * Deduct credits after a successful AI call.
   * Formula:
   *  - Input cost  = (tokensInput  / 1_000_000) * 3.00
   *  - Output cost = (tokensOutput / 1_000_000) * 15.00
   *  - Total USD → * 300 = credits
   *  - Round up to nearest integer
   */
  static async deductCredits(
    userId: string,
    tokensInput: number,
    tokensOutput: number,
    projectId?: string
  ): Promise<void> {
    try {
      const supabase = SupabaseService.getInstance().client;

      const inputCost = (tokensInput / 1_000_000) * 3.0;
      const outputCost = (tokensOutput / 1_000_000) * 15.0;
      const totalCostUsd = inputCost + outputCost;
      const creditsToDeduct = Math.ceil(totalCostUsd * 300);

      if (creditsToDeduct === 0) return;

      // Insert transaction row
      await supabase.from('forge_credit_transactions').insert({
        user_id: userId,
        project_id: projectId ?? null,
        type: 'spend',
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        cost_usd: totalCostUsd,
        amount_credits: -creditsToDeduct,
      });

      // Deduct from wallet (prevent going below 0)
      const { data: wallet } = await supabase
        .from('forge_credit_wallets')
        .select('balance_credits')
        .eq('user_id', userId)
        .single();

      const currentBalance = wallet?.balance_credits ?? 0;
      const newBalance = Math.max(0, currentBalance - creditsToDeduct);

      await supabase
        .from('forge_credit_wallets')
        .update({ balance_credits: newBalance })
        .eq('user_id', userId);
    } catch (e) {
      console.error('[CreditService] deductCredits error:', e);
    }
  }

  /**
   * Get current balance and free-prompt status for a user.
   */
  static async getBalance(
    userId: string
  ): Promise<{ balance: number; freePromptUsed: boolean }> {
    try {
      const supabase = SupabaseService.getInstance().client;

      const { data: wallet, error } = await supabase
        .from('forge_credit_wallets')
        .select('balance_credits, free_prompt_used')
        .eq('user_id', userId)
        .single();

      if (error || !wallet) {
        return { balance: 0, freePromptUsed: false };
      }

      return {
        balance: wallet.balance_credits ?? 0,
        freePromptUsed: wallet.free_prompt_used ?? false,
      };
    } catch (e) {
      console.error('[CreditService] getBalance error:', e);
      return { balance: 0, freePromptUsed: false };
    }
  }
}
