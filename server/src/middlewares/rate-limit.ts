import rateLimit from "express-rate-limit";

const baseMessage = { success: false, error: { code: "VALIDATION_ERROR", message: "Thu lai sau" } };

export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  statusCode: 429,
  message: baseMessage
});

export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  statusCode: 429,
  message: baseMessage
});
