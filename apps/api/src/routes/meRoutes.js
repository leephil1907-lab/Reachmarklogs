import express from 'express'
import * as me from '../controllers/meController.js'
import { protect } from '../middlewares/authMiddleware.js'

const router = express.Router()

router.get('/session', me.session)
router.get('/listings', protect, me.listings)
router.get('/orders', protect, me.orders)
router.get('/payouts', protect, me.payouts)
router.post('/payouts', protect, me.requestPayout)
router.post('/watchlist/:id', protect, me.watchlist)

export default router
