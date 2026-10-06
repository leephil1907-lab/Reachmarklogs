import express from 'express'
import * as copilot from '../controllers/copilotController.js'
import { protect, protectAdmin } from '../middlewares/authMiddleware.js'

const router = express.Router()

router.get('/status', copilot.status)
router.post('/listing', protect, copilot.listing)
router.post('/price', protect, copilot.price)
router.post('/reel', protect, copilot.reel)
router.post('/reply', protect, copilot.reply)
router.post('/risk', protectAdmin, copilot.risk)

export default router
