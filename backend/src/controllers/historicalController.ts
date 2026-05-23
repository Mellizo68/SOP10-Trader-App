import { Request, Response } from 'express'
import { thetaDataClient } from '../../../mcp-server-bebeto/dist/clients/theta-data-client.js'
import logger from '../utils/logger.js'

/**
 * Get historical Greeks over a date range
 */
export async function getHistoricalGreeks(req: Request, res: Response): Promise<void> {
  try {
    const { symbol } = req.params
    const { strike, expiration, type = 'call', startDate, endDate } = req.query

    if (!symbol) {
      res.status(400).json({
        success: false,
        error: 'Symbol parameter required',
      })
      return
    }

    if (!strike || !expiration || !startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: 'strike, expiration, startDate, and endDate query parameters required',
      })
      return
    }

    logger.info('Historical: Getting historical Greeks', {
      symbol,
      strike,
      expiration,
      type,
      startDate,
      endDate,
    })

    const data = await thetaDataClient.getHistoricalOptions(
      symbol as string,
      Number(strike),
      expiration as string,
      (type as string).toLowerCase() as 'call' | 'put',
      startDate as string,
      endDate as string
    )

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      strike,
      expiration,
      optionType: type,
      data,
      dataPoints: data.length,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error getting historical Greeks:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get historical Greeks',
    })
  }
}

/**
 * Get Greeks snapshot at a specific historical date
 */
export async function getHistoricalSnapshot(req: Request, res: Response): Promise<void> {
  try {
    const { symbol, date } = req.params
    const { strike, expiration, type = 'call' } = req.query

    if (!symbol || !date) {
      res.status(400).json({
        success: false,
        error: 'Symbol and date parameters required',
      })
      return
    }

    if (!strike || !expiration) {
      res.status(400).json({
        success: false,
        error: 'strike and expiration query parameters required',
      })
      return
    }

    logger.info('Historical: Getting Greeks snapshot', {
      symbol,
      date,
      strike,
      expiration,
      type,
    })

    // Get historical data for just that date
    const data = await thetaDataClient.getHistoricalOptions(
      symbol,
      Number(strike),
      expiration as string,
      (type as string).toLowerCase() as 'call' | 'put',
      date,
      date // Same start and end date to get just that day
    )

    if (data.length === 0) {
      res.status(404).json({
        success: false,
        error: `No data found for ${symbol} on ${date}`,
      })
      return
    }

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      date,
      strike,
      expiration,
      optionType: type,
      snapshot: data[0],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error getting historical snapshot:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get historical snapshot',
    })
  }
}

/**
 * Get volatility analysis (HV, IV, Skew)
 */
export async function getVolatility(req: Request, res: Response): Promise<void> {
  try {
    const { symbol } = req.params
    const { term = 'monthly' } = req.query

    if (!symbol) {
      res.status(400).json({
        success: false,
        error: 'Symbol parameter required',
      })
      return
    }

    logger.info('Historical: Getting volatility analysis', {
      symbol,
      term,
    })

    const volData = await thetaDataClient.getVolatility(symbol, term as string)

    if (!volData) {
      res.status(503).json({
        success: false,
        error: 'Volatility data unavailable',
      })
      return
    }

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      volatility: volData,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error getting volatility:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get volatility data',
    })
  }
}

/**
 * Get theta decay analysis
 */
export async function getThetaDecay(req: Request, res: Response): Promise<void> {
  try {
    const { symbol } = req.params
    const { expiration } = req.query

    if (!symbol) {
      res.status(400).json({
        success: false,
        error: 'Symbol parameter required',
      })
      return
    }

    if (!expiration) {
      res.status(400).json({
        success: false,
        error: 'expiration query parameter required',
      })
      return
    }

    logger.info('Historical: Getting theta decay analysis', {
      symbol,
      expiration,
    })

    const decayData = await thetaDataClient.getThetaDecay(symbol, expiration as string)

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      expiration,
      data: decayData,
      totalStrikes: decayData.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error getting theta decay:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get theta decay data',
    })
  }
}

/**
 * Get earnings dates and history for a symbol
 * NOTE: ThetaData doesn't have a direct earnings endpoint - this would require
 * web scraping or integrating another data source. Placeholder for future enhancement.
 */
export async function getEarnings(req: Request, res: Response): Promise<void> {
  try {
    const { symbol } = req.params

    if (!symbol) {
      res.status(400).json({
        success: false,
        error: 'Symbol parameter required',
      })
      return
    }

    logger.info('Historical: Getting earnings data', { symbol })

    // Placeholder response - would need to integrate with an earnings data provider
    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      data: [],
      message: 'Earnings endpoint requires integration with earnings data provider',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error getting earnings:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get earnings data',
    })
  }
}
