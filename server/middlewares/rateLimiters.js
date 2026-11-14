import { rateLimit } from "express-rate-limit";

export const limitTo10in1 = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
});

export const limitTo2in1 = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 2,
});

export const limitTo1in1Day = rateLimit({
  windowMs: 24 * 60 * 1 * 60 * 1000,
  limit: 1,
  standardHeaders: "draft-8",
});
