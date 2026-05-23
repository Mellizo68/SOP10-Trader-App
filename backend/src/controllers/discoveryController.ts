import { Request, Response } from 'express'
import { thetaDataClient } from '../../../mcp-server-bebeto/dist/clients/theta-data-client.js'
import logger from '../utils/logger.js'

/**
 * Get all available symbols for options trading
 */
export async function getSymbols(req: Request, res: Response): Promise<void> {
  try {
    const query = (req.query.q as string) || ''

    logger.info('Discovery: Getting available symbols', { query })

    const symbols = await thetaDataClient.getSymbols()

    // Filter by query if provided
    const filtered = query
      ? symbols.filter((s: string) => s.toUpperCase().includes(query.toUpperCase()))
      : symbols

    res.json({
      success: true,
      data: filtered,
      total: filtered.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error getting symbols:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get symbols',
    })
  }
}

/**
 * Get all expirations for a symbol
 */
export async function getExpirations(req: Request, res: Response): Promise<void> {
  try {
    const { symbol } = req.params

    if (!symbol) {
      res.status(400).json({
        success: false,
        error: 'Symbol parameter required',
      })
      return
    }

    logger.info('Discovery: Getting expirations', { symbol })

    const expirations = await thetaDataClient.getExpirations(symbol)

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      data: expirations,
      total: expirations.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error getting expirations:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get expirations',
    })
  }
}

/**
 * Get all strikes for a symbol/expiration
 */
export async function getStrikes(req: Request, res: Response): Promise<void> {
  try {
    const { symbol, expiration } = req.params

    if (!symbol || !expiration) {
      res.status(400).json({
        success: false,
        error: 'Symbol and expiration parameters required',
      })
      return
    }

    logger.info('Discovery: Getting strikes', { symbol, expiration })

    const strikes = await thetaDataClient.getStrikes(symbol, expiration)

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      expiration,
      data: strikes,
      total: strikes.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error getting strikes:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get strikes',
    })
  }
}

/**
 * Get full options chain (calls and puts) for a symbol/expiration
 */
export async function getOptionsChain(req: Request, res: Response): Promise<void> {
  try {
    const { symbol, expiration } = req.params

    if (!symbol || !expiration) {
      res.status(400).json({
        success: false,
        error: 'Symbol and expiration parameters required',
      })
      return
    }

    logger.info('Discovery: Getting options chain', { symbol, expiration })

    const chain = await thetaDataClient.getOptionsChain(symbol, expiration)

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      expiration,
      calls: chain.calls || [],
      puts: chain.puts || [],
      totalStrikes: (chain.calls?.length || 0) + (chain.puts?.length || 0),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error getting options chain:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get options chain',
    })
  }
}
