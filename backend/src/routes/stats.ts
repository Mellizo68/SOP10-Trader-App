import { Router, Request, Response } from 'express'
import { StatsController } from '../controllers/statsController'

const router = Router()

// GET /api/stats - Get all statistics
router.get('/', (req: Request, res: Response) => StatsController.getStatistics(req, res))

// GET /api/stats/by-strategy - Get statistics by strategy
router.get('/by-strategy', (req: Request, res: Response) => StatsController.getStrategyStats(req, res))

// GET /api/stats/by-confluence - Get statistics by confluence
router.get('/by-confluence', (req: Request, res: Response) => StatsController.getConfluenceStats(req, res))

export default router
