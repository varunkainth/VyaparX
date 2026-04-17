import type { Request, Response, NextFunction } from 'express'
import { getPlan } from '../utils/getPlan'
import type { PlanType } from '../config/planFeatures'

declare global {
  namespace Express {
    interface Request {
      plan?: PlanType
    }
  }
}

export async function planGuard(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id
    if (!userId) {
      return next()
    }

    req.plan = await getPlan(userId)
    return next()
  } catch (err) {
    return next(err)
  }
}
