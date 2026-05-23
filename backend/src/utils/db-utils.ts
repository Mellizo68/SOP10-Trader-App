import { TradeEntry } from '../types';

/**
 * Database Utils (Stub - Phase 5)
 */

export const formatTradeForDB = (trade: any): any => {
  return {
    id: trade.id,
    entryNumber: trade.entryNumber,
    dateEntry: trade.dateEntry,
    symbol: trade.symbol,
    strategy: trade.strategy,
    strikePrice: trade.strikePrice || 0,
    delta: trade.delta || 0,
    daysToExpiration: trade.daysToExpiration,
    ivPercent: trade.ivPercent || 0,
    gexStatus: trade.gexStatus,
    pvpStatus: trade.pvpStatus,
    vwapStatus: trade.vwapStatus,
    targetEntry: trade.targetEntry,
    targetTP: trade.targetTP,
    targetSL: trade.targetSL,
    confluenceScore: trade.confluenceScore,
    entryPrice: trade.entryPrice,
    status: trade.status,
    exitPrice: trade.exitPrice,
    exitDate: trade.exitDate,
    profitLoss: trade.profitLoss,
    percentReturn: trade.percentReturn,
    comments: trade.comments,
    screenshots: trade.screenshots
  };
};
