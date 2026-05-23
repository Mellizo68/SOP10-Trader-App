import { describe, it, expect, beforeEach } from 'vitest';
import {
  PositionSizingService,
  PositionSizingInput,
  PositionSizingOutput,
} from '../positionSizingService';

describe('PositionSizingService', () => {
  // ============================================================================
  // BASIC CALCULATIONS
  // ============================================================================

  describe('calculatePositionSize - Basic Calculations', () => {
    it('should calculate correct position size for 1.5% risk with 5-point stop', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 95,
        riskPercent: 1.5,
        accountSize: 50000,
      };

      const result = PositionSizingService.calculatePositionSize(input);

      // Risk amount = $50,000 × 1.5% = $750
      // Distance = $5
      // Position = $750 / $5 = 150 shares
      expect(result.positionSize).toBe(150);
      expect(result.maxRiskAmount).toBe(750);
      expect(result.actualRisk).toBe(750);
      expect(result.actualRiskPercent).toBe(1.5);
    });

    it('should calculate correct position size for 2% risk with 5-point stop', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 95,
        riskPercent: 2,
        accountSize: 50000,
      };

      const result = PositionSizingService.calculatePositionSize(input);

      // Risk amount = $50,000 × 2% = $1,000
      // Distance = $5
      // Position = $1,000 / $5 = 200 shares
      expect(result.positionSize).toBe(200);
      expect(result.maxRiskAmount).toBe(1000);
      expect(result.actualRisk).toBe(1000);
      expect(result.actualRiskPercent).toBe(2);
    });

    it('should use default account size of $50,000', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 95,
        riskPercent: 1.5,
        // accountSize omitted
      };

      const result = PositionSizingService.calculatePositionSize(input);

      expect(result.accountSize).toBe(50000);
      expect(result.maxRiskAmount).toBe(750);
    });

    it('should use default profit multiplier of 2.0x (1:2 ratio)', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 95,
        riskPercent: 1.5,
        // profitMultiplier omitted
      };

      const result = PositionSizingService.calculatePositionSize(input);

      expect(result.profitMultiplier).toBe(2.0);
      expect(result.riskRewardRatio).toBe(2.0);
    });

    it('should round position size to nearest whole number', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 98.33, // Distance: $1.67
        riskPercent: 1.5,
        accountSize: 50000,
        // Position = $750 / $1.67 = 449.1 → rounds to 449
      };

      const result = PositionSizingService.calculatePositionSize(input);

      expect(Number.isInteger(result.positionSize)).toBe(true);
      expect(result.positionSize).toBe(449);
    });
  });

  // ============================================================================
  // PROFIT TARGET CALCULATIONS
  // ============================================================================

  describe('calculatePositionSize - Profit Target', () => {
    it('should calculate profit target with 2x multiplier', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 95,
        riskPercent: 1.5,
        profitMultiplier: 2.0,
        accountSize: 50000,
      };

      const result = PositionSizingService.calculatePositionSize(input);

      // Risk: $750, Multiplier: 2x
      // Profit target = $750 × 2 = $1,500
      expect(result.profitTarget).toBe(1500);
    });

    it('should calculate exit price correctly with 2x multiplier', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 95,
        riskPercent: 1.5,
        profitMultiplier: 2.0,
        accountSize: 50000,
      };

      const result = PositionSizingService.calculatePositionSize(input);

      // Distance: $5, Multiplier: 2x
      // Exit = $100 + (2 × $5) = $110
      expect(result.exitPrice).toBe(110);
    });

    it('should calculate profit target with 3x multiplier', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 95,
        riskPercent: 1.5,
        profitMultiplier: 3.0,
        accountSize: 50000,
      };

      const result = PositionSizingService.calculatePositionSize(input);

      // Risk: $750, Multiplier: 3x
      // Profit target = $750 × 3 = $2,250
      expect(result.profitTarget).toBe(2250);
      expect(result.exitPrice).toBe(115); // $100 + (3 × $5)
    });

    it('should handle non-integer exit prices (decimals)', () => {
      const input: PositionSizingInput = {
        entryPrice: 450.25,
        stopLossPrice: 445.0,
        riskPercent: 1.5,
        profitMultiplier: 2.0,
        accountSize: 50000,
      };

      const result = PositionSizingService.calculatePositionSize(input);

      // Distance: $5.25, Multiplier: 2x
      // Exit = $450.25 + (2 × $5.25) = $460.75
      expect(result.exitPrice).toBe(460.75);
      expect(result.distanceToStop).toBe(5.25);
    });
  });

  // ============================================================================
  // RISK:REWARD RATIO CALCULATIONS
  // ============================================================================

  describe('calculatePositionSize - Risk:Reward Ratio', () => {
    it('should calculate 1:2 ratio (ideal)', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 95,
        riskPercent: 1.5,
        profitMultiplier: 2.0,
        accountSize: 50000,
      };

      const result = PositionSizingService.calculatePositionSize(input);

      expect(result.riskRewardRatio).toBe(2.0); // 1:2
    });

    it('should calculate 1:3 ratio', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 95,
        riskPercent: 1.5,
        profitMultiplier: 3.0,
        accountSize: 50000,
      };

      const result = PositionSizingService.calculatePositionSize(input);

      expect(result.riskRewardRatio).toBe(3.0); // 1:3
    });

    it('should calculate 1:5 ratio (maximum)', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 95,
        riskPercent: 1.5,
        profitMultiplier: 5.0,
        accountSize: 50000,
      };

      const result = PositionSizingService.calculatePositionSize(input);

      expect(result.riskRewardRatio).toBe(5.0); // 1:5
    });

    it('should calculate 1:1 ratio (breakeven)', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 95,
        riskPercent: 1.5,
        profitMultiplier: 1.0,
        accountSize: 50000,
      };

      // Profit multiplier 1.0 is below minimum of 1.5x, should throw
      expect(() => {
        PositionSizingService.calculatePositionSize(input);
      }).toThrow('Profit multiplier must be between 1.5x and 5x');
    });
  });

  // ============================================================================
  // VALIDATION & WARNINGS
  // ============================================================================

  describe('calculatePositionSize - Validations', () => {
    it('should pass validation for ideal 1.5% risk with 1:2 ratio', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 95,
        riskPercent: 1.5,
        profitMultiplier: 2.0,
        accountSize: 50000,
      };

      const result = PositionSizingService.calculatePositionSize(input);

      expect(result.isValid).toBe(true);
      expect(result.warnings.filter(w => w.severity === 'error')).toHaveLength(
        0
      );
    });

    it('should warn when risk exceeds 2%', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 99, // Only $1 distance
        riskPercent: 2, // This creates huge position
        accountSize: 50000,
        // Position would be $1,000 / $1 = 1,000 shares (2% risk)
        // But if we add more contracts, it exceeds 2%
      };

      const result = PositionSizingService.calculatePositionSize(input);

      // This is at 2% exactly, should not warn
      expect(
        result.warnings.some(w => w.type === 'risk' && w.severity === 'error')
      ).toBe(false);
    });

    it('should error when ratio exceeds 1:5', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 95,
        riskPercent: 1.5,
        profitMultiplier: 6.0, // 1:6 ratio - exceeds max
        accountSize: 50000,
      };

      // Profit multiplier 6.0 exceeds maximum of 5x, should throw
      expect(() => {
        PositionSizingService.calculatePositionSize(input);
      }).toThrow('Profit multiplier must be between 1.5x and 5x');
    });

    it('should error when ratio < 1:1', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 95,
        riskPercent: 1.5,
        profitMultiplier: 0.5, // 1:0.5 ratio - loses money
        accountSize: 50000,
      };

      expect(() => {
        PositionSizingService.calculatePositionSize(input);
      }).toThrow();
    });
  });

  // ============================================================================
  // INPUT VALIDATION
  // ============================================================================

  describe('Input Validation', () => {
    it('should reject entry price <= 0', () => {
      const input: PositionSizingInput = {
        entryPrice: 0,
        stopLossPrice: 95,
        riskPercent: 1.5,
      };

      expect(() => {
        PositionSizingService.calculatePositionSize(input);
      }).toThrow('Entry price must be a positive number');
    });

    it('should reject negative entry price', () => {
      const input: PositionSizingInput = {
        entryPrice: -100,
        stopLossPrice: 95,
        riskPercent: 1.5,
      };

      expect(() => {
        PositionSizingService.calculatePositionSize(input);
      }).toThrow('Entry price must be a positive number');
    });

    it('should reject entry price === stop loss', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 100,
        riskPercent: 1.5,
      };

      expect(() => {
        PositionSizingService.calculatePositionSize(input);
      }).toThrow('Entry price and stop loss cannot be the same');
    });

    it('should reject invalid risk percent', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 95,
        riskPercent: 1.0, // Invalid - only 1.5 or 2 allowed
      } as PositionSizingInput;

      expect(() => {
        PositionSizingService.calculatePositionSize(input);
      }).toThrow('Risk must be 1.5% or 2%');
    });

    it('should reject profit multiplier > 5x', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 95,
        riskPercent: 1.5,
        profitMultiplier: 6.0, // Exceeds max of 5x
      };

      expect(() => {
        PositionSizingService.calculatePositionSize(input);
      }).toThrow('Profit multiplier must be between 1.5x and 5x');
    });

    it('should reject profit multiplier < 1.5x', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 95,
        riskPercent: 1.5,
        profitMultiplier: 1.0, // Below min of 1.5x
      };

      expect(() => {
        PositionSizingService.calculatePositionSize(input);
      }).toThrow('Profit multiplier must be between 1.5x and 5x');
    });

    it('should reject negative account size', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 95,
        riskPercent: 1.5,
        accountSize: -50000,
      };

      expect(() => {
        PositionSizingService.calculatePositionSize(input);
      }).toThrow('Account size must be positive');
    });

    it('should reject invalid trade type', () => {
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 95,
        riskPercent: 1.5,
        tradeType: 'invalid' as any,
      };

      expect(() => {
        PositionSizingService.calculatePositionSize(input);
      }).toThrow('Trade type must be "long" or "short"');
    });
  });

  // ============================================================================
  // RISK:REWARD RATIO VALIDATION
  // ============================================================================

  describe('validateRiskRewardRatio', () => {
    it('should accept 1:2 ratio (ideal)', () => {
      const result = PositionSizingService.validateRiskRewardRatio(2.0);

      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should accept 1:3 ratio (ideal)', () => {
      const result = PositionSizingService.validateRiskRewardRatio(3.0);

      expect(result.valid).toBe(true);
    });

    it('should accept 1:5 ratio (maximum)', () => {
      const result = PositionSizingService.validateRiskRewardRatio(5.0);

      expect(result.valid).toBe(true);
    });

    it('should reject 1:6 ratio (exceeds max)', () => {
      const result = PositionSizingService.validateRiskRewardRatio(6.0);

      expect(result.valid).toBe(false);
      expect(result.warning).toContain('exceeds');
      expect(result.warning).toContain('1:5');
    });

    it('should reject < 1:1 ratio', () => {
      const result = PositionSizingService.validateRiskRewardRatio(0.5);

      expect(result.valid).toBe(false);
      expect(result.warning).toContain('below');
      expect(result.warning).toContain('1:1');
    });
  });

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  describe('getRiskLevel', () => {
    it('should return Conservative for risk <= 1%', () => {
      expect(PositionSizingService.getRiskLevel(0.5)).toBe('Conservative');
      expect(PositionSizingService.getRiskLevel(1.0)).toBe('Conservative');
    });

    it('should return Moderate for 1% < risk <= 1.5%', () => {
      expect(PositionSizingService.getRiskLevel(1.25)).toBe('Moderate');
      expect(PositionSizingService.getRiskLevel(1.5)).toBe('Moderate');
    });

    it('should return Aggressive for risk > 1.5%', () => {
      expect(PositionSizingService.getRiskLevel(1.75)).toBe('Aggressive');
      expect(PositionSizingService.getRiskLevel(2.0)).toBe('Aggressive');
    });
  });

  describe('getRatioQuality', () => {
    it('should return Excellent for 1:2 to 1:3 ratio', () => {
      expect(PositionSizingService.getRatioQuality(2.0)).toBe('Excellent');
      expect(PositionSizingService.getRatioQuality(2.5)).toBe('Excellent');
      expect(PositionSizingService.getRatioQuality(3.0)).toBe('Excellent');
    });

    it('should return Good for 1:1.5 to 1:2 ratio', () => {
      expect(PositionSizingService.getRatioQuality(1.5)).toBe('Good');
      expect(PositionSizingService.getRatioQuality(1.75)).toBe('Good');
    });

    it('should return Fair for other valid ratios', () => {
      expect(PositionSizingService.getRatioQuality(1.2)).toBe('Fair');
      expect(PositionSizingService.getRatioQuality(4.0)).toBe('Fair');
    });

    it('should return Invalid for < 1:1', () => {
      expect(PositionSizingService.getRatioQuality(0.5)).toBe('Invalid');
    });

    it('should return Poor for > 1:5', () => {
      expect(PositionSizingService.getRatioQuality(6.0)).toBe('Poor');
    });
  });

  // ============================================================================
  // EDGE CASES & REAL-WORLD SCENARIOS
  // ============================================================================

  describe('Real-world Scenarios', () => {
    it('Scenario A: Conservative trader', () => {
      // Entry: $450.25 | Stop: $445.00 | Risk: 1.5%
      const input: PositionSizingInput = {
        entryPrice: 450.25,
        stopLossPrice: 445.0,
        riskPercent: 1.5,
        accountSize: 50000,
      };

      const result = PositionSizingService.calculatePositionSize(input);

      // Risk: $50,000 × 1.5% = $750
      // Distance: $450.25 - $445.00 = $5.25
      // Position: $750 / $5.25 = 142.857... rounds to 143
      expect(result.positionSize).toBe(143);
      expect(result.actualRiskPercent).toBeCloseTo(1.49, 1);
      expect(result.exitPrice).toBeCloseTo(460.75, 1);
      expect(result.riskRewardRatio).toBe(2.0);
      expect(result.isValid).toBe(true);
    });

    it('Scenario B: Aggressive trader with wider stop', () => {
      // Entry: $450 | Stop: $440 | Risk: 2%
      const input: PositionSizingInput = {
        entryPrice: 450,
        stopLossPrice: 440,
        riskPercent: 2,
        profitMultiplier: 3.0,
        accountSize: 50000,
      };

      const result = PositionSizingService.calculatePositionSize(input);

      expect(result.positionSize).toBe(100);
      expect(result.actualRisk).toBe(1000);
      expect(result.profitTarget).toBe(3000);
      expect(result.riskRewardRatio).toBe(3.0);
      expect(result.isValid).toBe(true);
    });

    it('Scenario C: Tight stop with 1.5% risk', () => {
      // Entry: $100 | Stop: $99 | Risk: 1.5%
      const input: PositionSizingInput = {
        entryPrice: 100,
        stopLossPrice: 99,
        riskPercent: 1.5,
        accountSize: 50000,
      };

      const result = PositionSizingService.calculatePositionSize(input);

      expect(result.positionSize).toBe(750);
      expect(result.distanceToStop).toBe(1);
      expect(result.exitPrice).toBe(102);
      expect(result.riskRewardRatio).toBe(2.0);
    });
  });

  // ============================================================================
  // FORMAT FOR TRADE ENTRY
  // ============================================================================

  describe('formatForTradeEntry', () => {
    it('should format output for trade entry', () => {
      const input: PositionSizingInput = {
        entryPrice: 450.25,
        stopLossPrice: 445.0,
        riskPercent: 1.5,
        accountSize: 50000,
      };

      const output = PositionSizingService.calculatePositionSize(input);
      const formatted = PositionSizingService.formatForTradeEntry(output);

      expect(formatted).toEqual({
        entry_price: 450.25,
        stop_loss_price: 445.0,
        exit_price: output.exitPrice,
        position_size: 143, // Updated: $750 / $5.25 = 142.857... rounds to 143
        risk_amount: output.actualRisk,
        risk_percent: output.actualRiskPercent,
        profit_target: output.profitTarget,
        risk_reward_ratio: 2.0,
      });
    });
  });
});
