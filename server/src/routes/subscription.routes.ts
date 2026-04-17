import { Router } from 'express'
import { authenticateToken } from '../middleware/jwt'
import { planGuard } from '../middleware/planGaurd'
import { createSession, getPayments, getStatus, cancel } from '../controller/subscription.controller'

const subscriptionRouter = Router()

subscriptionRouter.use(authenticateToken)
subscriptionRouter.use(planGuard)

subscriptionRouter.post('/create-session', createSession)
subscriptionRouter.get('/status', getStatus)
subscriptionRouter.get('/payments', getPayments)
subscriptionRouter.post('/cancel', cancel)

export default subscriptionRouter
