/**
 * authRoutes — the account surface.
 *
 * `status`, `signup`, `login`, `forgot` and `reset` are public by necessity.
 * Everything else requires a session. Nothing here is mounted behind Clerk, so
 * the same routes serve both auth modes.
 */
import express from 'express'
import * as authController from '../controllers/authController.js'
import { protect } from '../middlewares/authMiddleware.js'

const router = express.Router()

/* public */
router.get('/status', authController.status)
router.post('/signup', authController.signup)
router.post('/login', authController.login)
router.post('/logout', authController.logout)
router.post('/verify-email', authController.verifyEmailToken)
router.get('/verify-email', authController.verifyEmailToken)
router.post('/forgot-password', authController.forgotPassword)
router.post('/reset-password', authController.resetPassword)
router.post('/reactivate', authController.reactivate)

/* resolves to `authenticated: false` for anonymous callers rather than 401 */
router.get('/session', authController.session)

/* authenticated */
router.post('/resend-verification', protect, authController.resendVerification)
router.post('/change-password', protect, authController.changePassword)
router.patch('/profile', protect, authController.updateProfile)
router.post('/deactivate', protect, authController.deactivate)
router.get('/sessions', protect, authController.sessions)
router.delete('/sessions/:id', protect, authController.revokeSession)
router.post('/sessions/revoke-others', protect, authController.revokeOtherSessions)

export default router
