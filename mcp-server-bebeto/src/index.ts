import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js'
import dotenv from 'dotenv'
import { flashAlphaClient } from './clients/flashalpha-client.js'
import { thetaDataClient } from './clients/theta-data-client.js'
import type { MarketAnalysis } from './utils/types.js'

dotenv.config()

/**
 * MCP Server "Bebeto" - Trading Analysis Server
 *
 * Combines FlashAlpha real-time data with Theta Data historical analysis
 * for comprehensive market and options analysis.
 *
 * Available Tools:
 * - get_gex_analysis: Real-time gamma exposure analysis
 * - get_market_data: Combined market data (GEX, Greeks, Walls, Volume/OI)
 * - get_gamma_flip_levels: Key price levels for gamma reversals
 * - get_options_walls: Support/resistance from options walls
 * - get_historical_options: Historical options chain data
 * - get_volatility_analysis: Historical and implied volatility
 * - get_theta_decay: Theta decay analysis by strike
 * - analyze_greeks_chain: Comprehensive Greeks analysis for an expiration
 * - analyze_theta_decay_opportunity: Identify theta decay opportunities
 */
class BebetoPlatform {
  private server: Server
  private tools: Tool[]

  constructor() {
    this.tools = this.defineTools()

    this.server = new Server(
      {
        name: 'bebeto-trader',
        version: '1.0.0',
        description:
          'MCP Server for trading analysis combining FlashAlpha real-time and Theta Data historical options data',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )

    this.setupToolHandlers()
    this.setupServerHandlers()
  }

  /**
   * Define all available MCP tools
   */
  private defineTools(): Tool[] {
    return [
      {
        name: 'get_gex_analysis',
        description:
          'Get real-time gamma exposure (GEX) analysis for a stock symbol. Returns net gamma, regime (bullish/bearish/neutral), gamma flip levels, and market microstructure insights.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g., SPY, QQQ, TSLA)',
            },
            strike: {
              type: 'number',
              description: 'Optional: Specific strike price to analyze',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_market_data',
        description:
          'Get comprehensive market data including GEX, Greeks across expirations, gamma flip levels, options walls, and volume/OI data. One-stop endpoint for full market analysis.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g., SPY, QQQ)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_gamma_flip_levels',
        description:
          'Identify critical gamma flip price levels where the market gamma regime reverses. Important for directional breakouts and support/resistance.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_options_walls',
        description:
          'Analyze major options walls (put/call concentrations at specific strikes). Strong walls indicate potential support/resistance levels.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol',
            },
            strikePrice: {
              type: 'number',
              description: 'Optional: Analyze specific strike price',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_greeks_analysis',
        description:
          'Get comprehensive Greeks analysis (Delta, Gamma, Theta, Vega) for all expirations of a symbol. Includes chain-wide aggregates and ratios.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol',
            },
            expiration: {
              type: 'string',
              description: 'Optional: Specific expiration date (YYYY-MM-DD)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_historical_options',
        description:
          'Get historical OHLCV data for a specific options contract. Useful for backtesting and studying price action of specific strikes/expirations.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol',
            },
            strike: {
              type: 'number',
              description: 'Strike price',
            },
            expiration: {
              type: 'string',
              description: 'Expiration date (YYYY-MM-DD)',
            },
            optionType: {
              type: 'string',
              enum: ['call', 'put'],
              description: 'Option type',
            },
            startDate: {
              type: 'string',
              description: 'Start date for historical data (YYYY-MM-DD)',
            },
            endDate: {
              type: 'string',
              description: 'End date for historical data (YYYY-MM-DD)',
            },
          },
          required: ['symbol', 'strike', 'expiration', 'optionType', 'startDate', 'endDate'],
        },
      },
      {
        name: 'get_volatility_analysis',
        description:
          'Get volatility analysis including historical volatility (HV), implied volatility (IV), and volatility skew. Compare across terms (weekly, monthly, quarterly).',
        inputSchema: {
          type: 'object' as const,
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol',
            },
            term: {
              type: 'string',
              enum: ['weekly', 'monthly', 'quarterly'],
              description: 'Optional: Volatility term (default: monthly)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_theta_decay',
        description:
          'Analyze theta decay by strike for a specific expiration. Identify which strikes have the fastest decay and when decay acceleration occurs.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol',
            },
            expiration: {
              type: 'string',
              description: 'Expiration date (YYYY-MM-DD)',
            },
          },
          required: ['symbol', 'expiration'],
        },
      },
      {
        name: 'get_options_chain',
        description:
          'Get complete options chain (calls and puts) for a specific expiration with OHLCV and Greeks data. Full market snapshot for an expiration.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol',
            },
            expiration: {
              type: 'string',
              description: 'Expiration date (YYYY-MM-DD)',
            },
          },
          required: ['symbol', 'expiration'],
        },
      },
      {
        name: 'analyze_market_structure',
        description:
          'Comprehensive market structure analysis combining GEX regime, gamma flip levels, options walls, and volume/OI. Returns actionable insights for trading decisions.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'analyze_theta_opportunity',
        description:
          'Identify attractive theta decay opportunities by comparing strike levels, days to expiration, and decay acceleration. Useful for income strategies.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol',
            },
            expiration: {
              type: 'string',
              description: 'Expiration date (YYYY-MM-DD)',
            },
            minDaysToExpiration: {
              type: 'number',
              description: 'Optional: Minimum days to expiration (default: 7)',
            },
          },
          required: ['symbol', 'expiration'],
        },
      },
    ]
  }

  /**
   * Setup tool request handlers
   */
  private setupToolHandlers() {
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params
      const argsObj = args as Record<string, unknown>

      try {
        switch (name) {
          case 'get_gex_analysis': {
            const { symbol, strike } = argsObj as { symbol: string; strike?: number }
            const gexData = await flashAlphaClient.getGEX(symbol, strike)
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      success: !!gexData,
                      data: gexData,
                      source: 'FlashAlpha',
                    },
                    null,
                    2
                  ),
                },
              ],
            }
          }

          case 'get_market_data': {
            const { symbol } = argsObj as { symbol: string }
            const marketData = await flashAlphaClient.getMarketData(symbol)
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      success: true,
                      data: marketData,
                      source: 'FlashAlpha',
                    },
                    null,
                    2
                  ),
                },
              ],
            }
          }

          case 'get_gamma_flip_levels': {
            const { symbol } = argsObj as { symbol: string }
            const flipData = await flashAlphaClient.getGammaFlip(symbol)
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      success: !!flipData,
                      data: flipData,
                      interpretation: flipData
                        ? `Current flip level: ${flipData.flipLevel}. Direction: ${flipData.direction} with ${flipData.strength * 100}% strength.`
                        : 'No gamma flip data available',
                      source: 'FlashAlpha',
                    },
                    null,
                    2
                  ),
                },
              ],
            }
          }

          case 'get_options_walls': {
            const { symbol, strikePrice } = argsObj as { symbol: string; strikePrice?: number }
            const wallsData = await flashAlphaClient.getOptionsWalls(symbol, strikePrice)
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      success: wallsData.length > 0,
                      data: wallsData,
                      source: 'FlashAlpha',
                    },
                    null,
                    2
                  ),
                },
              ],
            }
          }

          case 'get_greeks_analysis': {
            const { symbol, expiration } = argsObj as { symbol: string; expiration?: string }
            const greeksData = await flashAlphaClient.getGreeks(symbol)
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      success: greeksData.length > 0,
                      data: expiration
                        ? greeksData.filter((g) => g.expiration === expiration)
                        : greeksData,
                      summary: {
                        totalContracts: greeksData.length,
                        expirations: [...new Set(greeksData.map((g) => g.expiration))],
                      },
                      source: 'FlashAlpha',
                    },
                    null,
                    2
                  ),
                },
              ],
            }
          }

          case 'get_historical_options': {
            const { symbol, strike, expiration, optionType, startDate, endDate } = argsObj as {
              symbol: string
              strike: number
              expiration: string
              optionType: 'call' | 'put'
              startDate: string
              endDate: string
            }
            const histData = await thetaDataClient.getHistoricalOptions(
              symbol,
              strike,
              expiration,
              optionType,
              startDate,
              endDate
            )
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      success: histData.length > 0,
                      data: histData,
                      dataPoints: histData.length,
                      source: 'Theta Data',
                    },
                    null,
                    2
                  ),
                },
              ],
            }
          }

          case 'get_volatility_analysis': {
            const { symbol, term = 'monthly' } = argsObj as { symbol: string; term?: string }
            const volData = await thetaDataClient.getVolatility(symbol, term)
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      success: !!volData,
                      data: volData,
                      interpretation: volData
                        ? `HV: ${volData.historicalVolatility.toFixed(2)}%, IV: ${volData.impliedVolatility.toFixed(2)}%, Skew: ${volData.skew.toFixed(2)}`
                        : 'No volatility data available',
                      source: 'Theta Data',
                    },
                    null,
                    2
                  ),
                },
              ],
            }
          }

          case 'get_theta_decay': {
            const { symbol, expiration } = argsObj as { symbol: string; expiration: string }
            const thetaData = await thetaDataClient.getThetaDecay(symbol, expiration)
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      success: thetaData.length > 0,
                      data: thetaData,
                      analysis: {
                        totalStrikes: thetaData.length,
                        maxDailyDecay: Math.max(...thetaData.map((t) => t.dailyDecay)),
                        avgDailyDecay:
                          thetaData.reduce((sum, t) => sum + t.dailyDecay, 0) / thetaData.length,
                      },
                      source: 'Theta Data',
                    },
                    null,
                    2
                  ),
                },
              ],
            }
          }

          case 'get_options_chain': {
            const { symbol, expiration } = argsObj as { symbol: string; expiration: string }
            const chainData = await thetaDataClient.getOptionsChain(symbol, expiration)
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      success: chainData.calls.length > 0 || chainData.puts.length > 0,
                      data: chainData,
                      summary: {
                        callStrikes: chainData.calls.length,
                        putStrikes: chainData.puts.length,
                      },
                      source: 'Theta Data',
                    },
                    null,
                    2
                  ),
                },
              ],
            }
          }

          case 'analyze_market_structure': {
            const { symbol } = argsObj as { symbol: string }
            const marketData = await flashAlphaClient.getMarketData(symbol)
            const analysis: MarketAnalysis = {
              symbol,
              timestamp: new Date().toISOString(),
              gex: marketData.gex,
              gammaFlip: marketData.gammaFlip,
              supportLevels: marketData.walls
                .filter((w) => w.putWall.level === 'strong')
                .map((w) => w.strikePrice)
                .sort((a, b) => a - b),
              resistanceLevels: marketData.walls
                .filter((w) => w.callWall.level === 'strong')
                .map((w) => w.strikePrice)
                .sort((a, b) => b - a),
              bullishConfidence: marketData.gex?.gex || 0 > 0 ? 0.7 : 0.3,
              bearishConfidence: marketData.gex?.gex || 0 < 0 ? 0.7 : 0.3,
              recommendation:
                (marketData.gex?.gex || 0) > 0
                  ? 'BULLISH'
                  : (marketData.gex?.gex || 0) < 0
                    ? 'BEARISH'
                    : 'NEUTRAL',
            }
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(analysis, null, 2),
                },
              ],
            }
          }

          case 'analyze_theta_opportunity': {
            const { symbol, expiration, minDaysToExpiration = 7 } = argsObj as {
              symbol: string
              expiration: string
              minDaysToExpiration?: number
            }
            const thetaData = await thetaDataClient.getThetaDecay(symbol, expiration)
            const opportunities = thetaData
              .filter((t) => t.daysToExpiration >= minDaysToExpiration)
              .sort((a, b) => b.dailyDecay - a.dailyDecay)
              .slice(0, 5)
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      success: opportunities.length > 0,
                      opportunities,
                      recommendation:
                        opportunities.length > 0
                          ? `Top theta decay opportunities at strikes: ${opportunities.map((o) => o.strike).join(', ')}`
                          : 'No attractive theta opportunities for this expiration',
                      source: 'Theta Data',
                    },
                    null,
                    2
                  ),
                },
              ],
            }
          }

          default:
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      error: `Unknown tool: ${name}`,
                    },
                    null,
                    2
                  ),
                },
              ],
            }
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  error: error instanceof Error ? error.message : String(error),
                  tool: name,
                },
                null,
                2
              ),
            },
          ],
        }
      }
    })
  }

  /**
   * Setup server request handlers
   */
  private setupServerHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.tools,
    }))
  }

  /**
   * Start the server
   */
  async start() {
    console.log('🚀 Starting MCP Server "Bebeto"...')

    // Check API connectivity
    const flashAlphaHealthy = await flashAlphaClient.healthCheck()
    const thetaDataHealthy = await thetaDataClient.healthCheck()

    console.log(`FlashAlpha Status: ${flashAlphaHealthy ? '✅ Connected' : '⚠️ Unavailable'}`)
    console.log(`Theta Data Status: ${thetaDataHealthy ? '✅ Connected' : '⚠️ Unavailable'}`)

    const transport = new StdioServerTransport()
    await this.server.connect(transport)

    console.log('📡 Server connected via stdio')
    console.log('Available tools:', this.tools.map((t) => t.name).join(', '))
  }
}

// Start the server
const platform = new BebetoPlatform()
platform.start().catch((error) => {
  console.error('❌ Failed to start server:', error)
  process.exit(1)
})
