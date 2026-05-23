/**
 * Analytics Service
 * Provides comprehensive trading analytics and statistics
 */

export interface MonthlyStats {
  month: string;        // "2026-05"
  wins: number;
  losses: number;
  winRate: number;      // Percentage (0-100)
  pnl: number;
  avgWinSize: number;
  avgLossSize: number;
  totalTrades: number;
}

export interface WeeklyStats {
  week: string;         // "2026-W20"
  weekStart: string;    // ISO date
  weekEnd: string;      // ISO date
  wins: number;
  losses: number;
  pnl: number;
  winRate: number;
  totalTrades: number;
}

export interface StreakData {
  current: 'win' | 'loss' | 'none';
  currentCount: number;
  longestWinStreak: number;
  longestLossStreak: number;
  winStreakDate: string;  // When longest win streak started
  lossStreakDate: string; // When longest loss streak started
  allStreaks: Array<{
    type: 'win' | 'loss';
    count: number;
    startDate: string;
    endDate: string;
  }>;
}

export interface DurationStats {
  avgHoldTime: number;           // Hours
  medianHoldTime: number;
  shortestHold: { symbol: string; hours: number; pnl: number };
  longestHold: { symbol: string; hours: number; pnl: number };
  byStrategy: Record<string, { avgHoldTime: number; tradeCount: number }>;
}

export interface DurationDistribution {
  ranges: Array<{
    label: string;               // "< 1 hour", "1-4 hours", etc.
    count: number;
    percentage: number;
    minHours?: number;
    maxHours?: number;
  }>;
}

export interface Trade {
  id: number;
  symbol: string;
  entry_price: number;
  stop_loss_price: number;
  exit_price: number;
  position_size: number;
  entry_date: string;    // ISO date
  exit_date: string;     // ISO date
  strategy: string;
  setup_type: string;
  status: 'open' | 'closed';
  profit_loss: number;
  return_percent: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Analytics Service
 * Handles all trading analytics calculations
 */
export class AnalyticsService {
  /**
   * Calculate monthly statistics
   */
  static calculateMonthlyStats(trades: Trade[]): MonthlyStats[] {
    if (trades.length === 0) return []

    const monthMap = new Map<string, Trade[]>()

    // Group trades by month
    trades.forEach((trade) => {
      if (trade.status !== 'closed') return
      const month = trade.exit_date.substring(0, 7) // "2026-05"
      if (!monthMap.has(month)) {
        monthMap.set(month, [])
      }
      monthMap.get(month)!.push(trade)
    })

    // Calculate stats for each month
    return Array.from(monthMap.entries())
      .map(([month, monthTrades]) => {
        const wins = monthTrades.filter((t) => t.profit_loss > 0).length
        const losses = monthTrades.filter((t) => t.profit_loss < 0).length
        const breakeven = monthTrades.filter((t) => t.profit_loss === 0).length
        const totalTrades = monthTrades.length
        const pnl = monthTrades.reduce((sum, t) => sum + t.profit_loss, 0)

        const winTrades = monthTrades.filter((t) => t.profit_loss > 0)
        const lossTrades = monthTrades.filter((t) => t.profit_loss < 0)

        const avgWinSize =
          winTrades.length > 0
            ? winTrades.reduce((sum, t) => sum + t.profit_loss, 0) / winTrades.length
            : 0

        const avgLossSize =
          lossTrades.length > 0
            ? lossTrades.reduce((sum, t) => sum + t.profit_loss, 0) / lossTrades.length
            : 0

        return {
          month,
          wins,
          losses,
          winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
          pnl: Math.round(pnl * 100) / 100,
          avgWinSize: Math.round(avgWinSize * 100) / 100,
          avgLossSize: Math.round(avgLossSize * 100) / 100,
          totalTrades,
        }
      })
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  /**
   * Calculate weekly statistics
   */
  static calculateWeeklyStats(trades: Trade[]): WeeklyStats[] {
    if (trades.length === 0) return []

    const weekMap = new Map<string, Trade[]>()

    trades.forEach((trade) => {
      if (trade.status !== 'closed') return

      const date = new Date(trade.exit_date)
      const weekNumber = this.getWeekNumber(date)
      const year = date.getFullYear()
      const week = `${year}-W${String(weekNumber).padStart(2, '0')}`

      if (!weekMap.has(week)) {
        weekMap.set(week, [])
      }
      weekMap.get(week)!.push(trade)
    })

    return Array.from(weekMap.entries())
      .map(([week, weekTrades]) => {
        const wins = weekTrades.filter((t) => t.profit_loss > 0).length
        const losses = weekTrades.filter((t) => t.profit_loss < 0).length
        const totalTrades = weekTrades.length
        const pnl = weekTrades.reduce((sum, t) => sum + t.profit_loss, 0)

        // Calculate week start and end dates
        const [yearStr, weekStr] = week.split('-W')
        const weekStart = this.getWeekStartDate(parseInt(yearStr), parseInt(weekStr))
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)

        return {
          week,
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          wins,
          losses,
          pnl: Math.round(pnl * 100) / 100,
          winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
          totalTrades,
        }
      })
      .sort((a, b) => a.week.localeCompare(b.week))
  }

  /**
   * Calculate win/loss streaks
   */
  static calculateStreaks(trades: Trade[]): StreakData {
    const closedTrades = trades
      .filter((t) => t.status === 'closed')
      .sort((a, b) => new Date(a.exit_date).getTime() - new Date(b.exit_date).getTime())

    if (closedTrades.length === 0) {
      return {
        current: 'none',
        currentCount: 0,
        longestWinStreak: 0,
        longestLossStreak: 0,
        winStreakDate: '',
        lossStreakDate: '',
        allStreaks: [],
      }
    }

    const allStreaks: StreakData['allStreaks'] = []
    let currentStreak: 'win' | 'loss' | null = null
    let streakCount = 0
    let streakStartDate = ''
    let longestWinStreak = 0
    let longestLossStreak = 0
    let winStreakDate = ''
    let lossStreakDate = ''

    closedTrades.forEach((trade, index) => {
      const isWin = trade.profit_loss > 0

      if (currentStreak === null) {
        // Start first streak
        currentStreak = isWin ? 'win' : 'loss'
        streakCount = 1
        streakStartDate = trade.exit_date
      } else if ((isWin && currentStreak === 'win') || (!isWin && currentStreak === 'loss')) {
        // Continue current streak
        streakCount++
      } else {
        // Streak ended, record it
        allStreaks.push({
          type: currentStreak,
          count: streakCount,
          startDate: streakStartDate,
          endDate: closedTrades[index - 1].exit_date,
        })

        // Update longest streaks
        if (currentStreak === 'win' && streakCount > longestWinStreak) {
          longestWinStreak = streakCount
          winStreakDate = streakStartDate
        } else if (currentStreak === 'loss' && streakCount > longestLossStreak) {
          longestLossStreak = streakCount
          lossStreakDate = streakStartDate
        }

        // Start new streak
        currentStreak = isWin ? 'win' : 'loss'
        streakCount = 1
        streakStartDate = trade.exit_date
      }
    })

    // Don't forget the last streak
    if (currentStreak !== null) {
      allStreaks.push({
        type: currentStreak,
        count: streakCount,
        startDate: streakStartDate,
        endDate: closedTrades[closedTrades.length - 1].exit_date,
      })

      if (currentStreak === 'win' && streakCount > longestWinStreak) {
        longestWinStreak = streakCount
        winStreakDate = streakStartDate
      } else if (currentStreak === 'loss' && streakCount > longestLossStreak) {
        longestLossStreak = streakCount
        lossStreakDate = streakStartDate
      }
    }

    return {
      current: currentStreak || 'none',
      currentCount: streakCount,
      longestWinStreak,
      longestLossStreak,
      winStreakDate,
      lossStreakDate,
      allStreaks,
    }
  }

  /**
   * Calculate win probability based on streak length
   * Mean reversion: probability decreases with longer streaks
   */
  static getWinProbability(streakLength: number): number {
    if (streakLength <= 0) return 50

    // Mean reversion formula: probability decreases with streak length
    // Approaches ~40% for very long streaks, stays near 50% for short ones
    const regression = 50 - (10 * streakLength) / (streakLength + 2)
    return Math.round(regression * 100) / 100
  }

  /**
   * Get duration statistics
   */
  static calculateDurationStats(trades: Trade[]): DurationStats {
    const closedTrades = trades.filter((t) => t.status === 'closed')

    if (closedTrades.length === 0) {
      return {
        avgHoldTime: 0,
        medianHoldTime: 0,
        shortestHold: { symbol: '', hours: 0, pnl: 0 },
        longestHold: { symbol: '', hours: 0, pnl: 0 },
        byStrategy: {},
      }
    }

    // Calculate hold times
    const durations = closedTrades.map((trade) => {
      const entryDate = new Date(trade.entry_date)
      const exitDate = new Date(trade.exit_date)
      const hours = (exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60)
      return { trade, hours: Math.max(0, hours) }
    })

    const holdTimes = durations.map((d) => d.hours).sort((a, b) => a - b)
    const avgHoldTime = holdTimes.reduce((sum, h) => sum + h, 0) / holdTimes.length
    const medianHoldTime =
      holdTimes.length % 2 === 0
        ? (holdTimes[holdTimes.length / 2 - 1] + holdTimes[holdTimes.length / 2]) / 2
        : holdTimes[Math.floor(holdTimes.length / 2)]

    // Find shortest and longest
    const shortest = durations.reduce((min, d) =>
      d.hours < min.hours ? d : min
    )
    const longest = durations.reduce((max, d) =>
      d.hours > max.hours ? d : max
    )

    // By strategy analysis
    const byStrategy: DurationStats['byStrategy'] = {}
    closedTrades.forEach((trade) => {
      const entryDate = new Date(trade.entry_date)
      const exitDate = new Date(trade.exit_date)
      const hours = (exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60)

      if (!byStrategy[trade.strategy]) {
        byStrategy[trade.strategy] = { avgHoldTime: 0, tradeCount: 0 }
      }
      byStrategy[trade.strategy].avgHoldTime += hours
      byStrategy[trade.strategy].tradeCount++
    })

    Object.keys(byStrategy).forEach((strategy) => {
      byStrategy[strategy].avgHoldTime =
        Math.round((byStrategy[strategy].avgHoldTime / byStrategy[strategy].tradeCount) * 100) /
        100
    })

    return {
      avgHoldTime: Math.round(avgHoldTime * 100) / 100,
      medianHoldTime: Math.round(medianHoldTime * 100) / 100,
      shortestHold: {
        symbol: shortest.trade.symbol,
        hours: Math.round(shortest.hours * 100) / 100,
        pnl: Math.round(shortest.trade.profit_loss * 100) / 100,
      },
      longestHold: {
        symbol: longest.trade.symbol,
        hours: Math.round(longest.hours * 100) / 100,
        pnl: Math.round(longest.trade.profit_loss * 100) / 100,
      },
      byStrategy,
    }
  }

  /**
   * Calculate duration distribution (bucketed by time ranges)
   */
  static calculateDurationDistribution(trades: Trade[]): DurationDistribution {
    const closedTrades = trades.filter((t) => t.status === 'closed')

    if (closedTrades.length === 0) {
      return {
        ranges: [
          { label: '< 1 hour', count: 0, percentage: 0, minHours: 0, maxHours: 1 },
          { label: '1-4 hours', count: 0, percentage: 0, minHours: 1, maxHours: 4 },
          { label: '4-24 hours', count: 0, percentage: 0, minHours: 4, maxHours: 24 },
          { label: '1-7 days', count: 0, percentage: 0, minHours: 24, maxHours: 168 },
          { label: '> 7 days', count: 0, percentage: 0, minHours: 168, maxHours: Infinity },
        ],
      }
    }

    const buckets = [
      { label: '< 1 hour', min: 0, max: 1, count: 0 },
      { label: '1-4 hours', min: 1, max: 4, count: 0 },
      { label: '4-24 hours', min: 4, max: 24, count: 0 },
      { label: '1-7 days', min: 24, max: 168, count: 0 },
      { label: '> 7 days', min: 168, max: Infinity, count: 0 },
    ]

    closedTrades.forEach((trade) => {
      const entryDate = new Date(trade.entry_date)
      const exitDate = new Date(trade.exit_date)
      const hours = (exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60)

      for (const bucket of buckets) {
        if (hours >= bucket.min && hours < bucket.max) {
          bucket.count++
          break
        }
      }
    })

    const totalTrades = closedTrades.length

    return {
      ranges: buckets.map((bucket) => ({
        label: bucket.label,
        count: bucket.count,
        percentage: Math.round((bucket.count / totalTrades) * 10000) / 100,
        minHours: bucket.min,
        maxHours: bucket.max === Infinity ? undefined : bucket.max,
      })),
    }
  }

  /**
   * Helper: Get ISO week number
   */
  private static getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  }

  /**
   * Helper: Get week start date (Monday) from ISO week number
   */
  private static getWeekStartDate(year: number, week: number): Date {
    const simple = new Date(year, 0, 1 + (week - 1) * 7)
    const dow = simple.getDay()
    const ISOweekStart = simple
    if (dow <= 4) {
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1)
    } else {
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay())
    }
    return ISOweekStart
  }
}
