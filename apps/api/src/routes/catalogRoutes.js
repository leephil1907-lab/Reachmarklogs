import express from 'express'
import * as catalog from '../controllers/catalogController.js'

const router = express.Router()

// Public floor — no auth required, mirrors the client's local catalog.
router.get('/', catalog.list)
router.get('/facets', catalog.facets)
router.get('/filters', catalog.filters)
router.get('/summary', catalog.summary)
router.get('/:id', catalog.detail)
router.get('/:id/chain', catalog.chain)

export default router
