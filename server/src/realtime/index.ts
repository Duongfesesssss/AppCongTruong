import { Router } from "express";

import { requireAuth } from "../middlewares/require-auth";
import { asyncHandler, sendSuccess } from "../lib/response";

const router = Router();

router.get(
  "/health",
  requireAuth,
  asyncHandler(async (_req, res) => {
    return sendSuccess(res, { ok: true });
  })
);

export default router;
