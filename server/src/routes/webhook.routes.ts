import express from 'express'
import { Router } from 'express'
import { handleRazorpayWebhook } from '../controller/webhook.controller'

const router = Router()

// CRITICAL: raw body required for signature verification
// Do NOT use express.json() here
router.post(
  '/razorpay',
  express.raw({ type: 'application/json' }),
  handleRazorpayWebhook
)

export default router