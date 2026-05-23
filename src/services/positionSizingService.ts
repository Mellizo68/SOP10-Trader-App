/**
 * Position Sizing Service
 * Calculates optimal position sizes based on risk management rules
 *
 * Account: $50,000
 * Risk tolerance: 1.5% (ideal) to 2% (max)
 * Risk:Reward ratio: > 1:1 but NOT > 1:5 or 1:6
 */

export interface PositionSizingInput {
  entryPrice: number;
  stopLossPrice: number;
  riskPercent: 1.5 | 2;
  profitMultiplier?: number; // Default 2.0 (1:2 ratio)
  accountSize?: number; // Default $50,000
  tradeType?: 'long' | 'short'; // Default 'long'
}

export interface PositionSizingOutput {
  // Input echoing
  entryPrice: number;
  stopLossPrice: number;
  riskPercent: 1.5 | 2;
  accountSize: number;

  // Calculations
  distanceToStop: number; // Price distance
  positionSize: number; // Number of shares/contracts
  maxRiskAmount: number; // Dollar amount at risk
  actualRisk: number; // Actual dollar loss if stop hit
  actualRiskPercent: number; // Actual % of account at risk

  // Profit target
  profitMultiplier: number;
  profitTarget: number; // Dollar profit target
  exitPrice: number; // Exit price to hit profit target

  // Risk:Reward ratio
  riskRewardRatio: number; // Profit / Risk

  // Validations
  warnings: Warning[];
  validations: Validation[];
  isValid: boolean;
}

export interface Warning {
  type: 'risk' | 'ratio' | 'position' | 'precision';
  message: string;
  severity: 'warning' | 'error';
}

export interface Validation {
  name: string;
  passed: boolean;
  message?: string;
}

export interface RatioValidationResult {
  valid: boolean;
  warning?: string;
}

/**
 * Position Sizing Service
 * Handles all calculations for risk management
 */
export class PositionSizingService {
  // Constants
  private static readonly DEFAULT_ACCOUNT_SIZE = 50000;
  private static readonly MIN_POSITION_SIZE = 1;
  private static readonly MAX_POSITION_SIZE = 10000;
  private static readonly MIN_RATIO = 1.0; // 1:1
  private static readonly MAX_RATIO = 5.0; // 1:5
  private static readonly DEFAULT_MULTIPLIER = 2.0; // 1:2 ratio
  private static readonly MIN_MULTIPLIER = 1.5;
  private static readonly MAX_MULTIPLIER = 5.0;
  private static readonly MIN_PRICE_DISTANCE = 0.01;

  /**
   * Calculate position size based on risk parameters
   */
  static calculatePositionSize(input: PositionSizingInput): PositionSizingOutput {
    // Validate inputs
    this.validateInputs(input);

    // Use defaults
    const accountSize = input.accountSize || this.DEFAULT_ACCOUNT_SIZE;
    const profitMultiplier = input.profitMultiplier || this.DEFAULT_MULTIPLIER;
    const tradeType = input.tradeType || 'long';

    // Calculate basic metrics
    const maxRiskAmount = accountSize * (input.riskPercent / 100);
    const distanceToStop = Math.abs(input.entryPrice - input.stopLossPrice);

    // Calculate position size
    const positionSize = Math.round(maxRiskAmount / distanceToStop);

    // Actual risk values
    const actualRisk = positionSize * distanceToStop;
    const actualRiskPercent = (actualRisk / accountSize) * 100;

    // Calculate profit target
    const profitTarget = maxRiskAmount * profitMultiplier;
    const exitPrice = input.entryPrice + (distanceToStop * profitMultiplier);

    // Calculate risk:reward ratio
    const riskRewardRatio = profitTarget / maxRiskAmount;

    // Validate outputs
    const warnings = this.generateWarnings(
      positionSize,
      actualRiskPercent,
      riskRewardRatio,
      actualRisk,
      maxRiskAmount
    );

    const validations = this.generateValidations(
      positionSize,
      actualRiskPercent,
      riskRewardRatio,
      distanceToStop
    );

    // isValid checks only CRITICAL validations (hard limits), not IDEAL validations
    const criticalValidations = validations.filter(v =>
      v.name !== 'Risk Within 1.5% (Ideal)' &&
      v.name !== 'Ideal Ratio (1:2 to 1:3)'
    );

    const isValid = criticalValidations.every(v => v.passed) &&
                    warnings.every(w => w.severity !== 'error');

    return {
      entryPrice: input.entryPrice,
      stopLossPrice: input.stopLossPrice,
      riskPercent: input.riskPercent,
      accountSize,
      distanceToStop: Math.round(distanceToStop * 100) / 100,
      positionSize,
      maxRiskAmount: Math.round(maxRiskAmount * 100) / 100,
      actualRisk: Math.round(actualRisk * 100) / 100,
      actualRiskPercent: Math.round(actualRiskPercent * 100) / 100,
      profitMultiplier,
      profitTarget: Math.round(profitTarget * 100) / 100,
      exitPrice: Math.round(exitPrice * 100) / 100,
      riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
      warnings,
      validations,
      isValid,
    };
  }

  /**
   * Validate input parameters
   */
  private static validateInputs(input: PositionSizingInput): void {
    if (!input.entryPrice || input.entryPrice <= 0) {
      throw new Error('Entry price must be a positive number');
    }

    if (!input.stopLossPrice || input.stopLossPrice <= 0) {
      throw new Error('Stop loss price must be a positive number');
    }

    if (input.entryPrice === input.stopLossPrice) {
      throw new Error('Entry price and stop loss cannot be the same');
    }

    const distance = Math.abs(input.entryPrice - input.stopLossPrice);
    if (distance < this.MIN_PRICE_DISTANCE) {
      throw new Error(
        `Minimum distance to stop loss is $${this.MIN_PRICE_DISTANCE}`
      );
    }

    if (![1.5, 2].includes(input.riskPercent)) {
      throw new Error('Risk must be 1.5% or 2%');
    }

    if (input.profitMultiplier !== undefined) {
      if (
        input.profitMultiplier < this.MIN_MULTIPLIER ||
        input.profitMultiplier > this.MAX_MULTIPLIER
      ) {
        throw new Error(
          `Profit multiplier must be between ${this.MIN_MULTIPLIER}x and ${this.MAX_MULTIPLIER}x`
        );
      }
    }

    if (input.accountSize && input.accountSize <= 0) {
      throw new Error('Account size must be positive');
    }

    if (input.tradeType && !['long', 'short'].includes(input.tradeType)) {
      throw new Error('Trade type must be "long" or "short"');
    }
  }

  /**
   * Generate warning messages based on calculations
   */
  private static generateWarnings(
    positionSize: number,
    actualRiskPercent: number,
    riskRewardRatio: number,
    actualRisk: number,
    maxRiskAmount: number
  ): Warning[] {
    const warnings: Warning[] = [];

    // Position size warnings
    if (positionSize < this.MIN_POSITION_SIZE) {
      warnings.push({
        type: 'position',
        severity: 'error',
        message: `Position size too small (minimum ${this.MIN_POSITION_SIZE} shares)`,
      });
    }

    if (positionSize > this.MAX_POSITION_SIZE) {
      warnings.push({
        type: 'position',
        severity: 'warning',
        message: `Position size ${positionSize} shares is very large - consider reducing`,
      });
    }

    // Risk percent warnings
    if (actualRiskPercent > 2.0) {
      warnings.push({
        type: 'risk',
        severity: 'error',
        message: `Risk ${actualRiskPercent.toFixed(2)}% exceeds 2% maximum`,
      });
    } else if (actualRiskPercent > 1.75) {
      warnings.push({
        type: 'risk',
        severity: 'warning',
        message: `Risk ${actualRiskPercent.toFixed(2)}% approaching 2% maximum`,
      });
    }

    // Risk:Reward ratio warnings
    if (riskRewardRatio > this.MAX_RATIO + 0.1) {
      warnings.push({
        type: 'ratio',
        severity: 'error',
        message: `Risk:Reward ratio 1:${riskRewardRatio.toFixed(1)} exceeds 1:${this.MAX_RATIO} maximum`,
      });
    } else if (riskRewardRatio > this.MAX_RATIO) {
      warnings.push({
        type: 'ratio',
        severity: 'warning',
        message: `Risk:Reward ratio 1:${riskRewardRatio.toFixed(1)} at maximum limit`,
      });
    }

    if (riskRewardRatio < this.MIN_RATIO) {
      warnings.push({
        type: 'ratio',
        severity: 'error',
        message: `Risk:Reward ratio 1:${riskRewardRatio.toFixed(1)} is less than 1:1 (position loses money at target)`,
      });
    }

    // Precision warnings
    if (actualRisk > maxRiskAmount * 1.05 || actualRisk < maxRiskAmount * 0.95) {
      warnings.push({
        type: 'precision',
        severity: 'warning',
        message: `Actual risk $${actualRisk.toFixed(2)} differs from target by rounding`,
      });
    }

    return warnings;
  }

  /**
   * Generate validation checks
   */
  private static generateValidations(
    positionSize: number,
    actualRiskPercent: number,
    riskRewardRatio: number,
    distanceToStop: number
  ): Validation[] {
    return [
      {
        name: 'Position Size Valid',
        passed:
          positionSize >= this.MIN_POSITION_SIZE &&
          positionSize <= this.MAX_POSITION_SIZE,
        message:
          positionSize < this.MIN_POSITION_SIZE
            ? 'Position too small'
            : positionSize > this.MAX_POSITION_SIZE
              ? 'Position too large'
              : undefined,
      },
      {
        name: 'Risk Within 2%',
        passed: actualRiskPercent <= 2.0,
        message:
          actualRiskPercent > 2.0
            ? `Risk is ${actualRiskPercent.toFixed(2)}%`
            : undefined,
      },
      {
        name: 'Risk Within 1.5% (Ideal)',
        passed: actualRiskPercent <= 1.5,
        message:
          actualRiskPercent > 1.5
            ? `Risk is ${actualRiskPercent.toFixed(2)}%`
            : undefined,
      },
      {
        name: 'Ratio > 1:1',
        passed: riskRewardRatio >= this.MIN_RATIO,
        message:
          riskRewardRatio < this.MIN_RATIO
            ? `Ratio is 1:${riskRewardRatio.toFixed(1)}`
            : undefined,
      },
      {
        name: 'Ratio < 1:5',
        passed: riskRewardRatio <= this.MAX_RATIO,
        message:
          riskRewardRatio > this.MAX_RATIO
            ? `Ratio is 1:${riskRewardRatio.toFixed(1)}`
            : undefined,
      },
      {
        name: 'Ideal Ratio (1:2 to 1:3)',
        passed: riskRewardRatio >= 2.0 && riskRewardRatio <= 3.0,
        message:
          riskRewardRatio < 2.0 || riskRewardRatio > 3.0
            ? `Ratio is 1:${riskRewardRatio.toFixed(1)}`
            : undefined,
      },
      {
        name: 'Valid Stop Distance',
        passed: distanceToStop >= this.MIN_PRICE_DISTANCE,
        message:
          distanceToStop < this.MIN_PRICE_DISTANCE
            ? `Distance $${distanceToStop.toFixed(2)} too small`
            : undefined,
      },
    ];
  }

  /**
   * Validate risk:reward ratio
   */
  static validateRiskRewardRatio(ratio: number): RatioValidationResult {
    if (ratio < this.MIN_RATIO) {
      return {
        valid: false,
        warning: `Ratio 1:${ratio.toFixed(1)} is below 1:1 minimum`,
      };
    }

    if (ratio > this.MAX_RATIO) {
      return {
        valid: false,
        warning: `Ratio 1:${ratio.toFixed(1)} exceeds 1:${this.MAX_RATIO} maximum`,
      };
    }

    if (ratio >= 2.0 && ratio <= 3.0) {
      return {
        valid: true,
      };
    }

    return {
      valid: true,
    };
  }

  /**
   * Format position sizing output for trade entry
   */
  static formatForTradeEntry(output: PositionSizingOutput) {
    return {
      entry_price: output.entryPrice,
      stop_loss_price: output.stopLossPrice,
      exit_price: output.exitPrice,
      position_size: output.positionSize,
      risk_amount: output.actualRisk,
      risk_percent: output.actualRiskPercent,
      profit_target: output.profitTarget,
      risk_reward_ratio: output.riskRewardRatio,
    };
  }

  /**
   * Get risk level description
   */
  static getRiskLevel(riskPercent: number): 'Conservative' | 'Moderate' | 'Aggressive' {
    if (riskPercent <= 1.0) return 'Conservative';
    if (riskPercent <= 1.5) return 'Moderate';
    return 'Aggressive';
  }

  /**
   * Get ratio quality description
   */
  static getRatioQuality(
    ratio: number
  ): 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Invalid' {
    if (ratio < 1.0) return 'Invalid';
    if (ratio >= 2.0 && ratio <= 3.0) return 'Excellent';
    if (ratio >= 1.5 && ratio < 2.0) return 'Good';
    if (ratio >= 1.0 && ratio < 1.5) return 'Fair';
    if (ratio > 3.0 && ratio <= 5.0) return 'Fair';
    return 'Poor';
  }
}
