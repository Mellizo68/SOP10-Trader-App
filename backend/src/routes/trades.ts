import { Router, Request, Response } from 'express'
import { TradesController } from '../controllers/tradesController'

const router = Router()

// GET /api/trades - Get all trades with pagination
router.get('/', (req: Request, res: Response) => TradesController.getAllTrades(req, res))

// GET /api/trades/:id - Get a specific trade
router.get('/:id', (req: Request, res: Response) => TradesController.getTradeById(req, res))

// POST /api/trades - Create a new trade
router.post('/', (req: Request, res: Response) => TradesController.createTrade(req, res))

// PUT /api/trades/:id - Update a trade
router.put('/:id', (req: Request, res: Response) => TradesController.updateTrade(req, res))

// PUT /api/trades/:id/close - Close a trade
router.put('/:id/close', (req: Request, res: Response) => TradesController.closeTrade(req, res))

// DELETE /api/trades/:id - Delete a trade
router.delete('/:id', (req: Request, res: Response) => TradesController.deleteTrade(req, res))

export default router
