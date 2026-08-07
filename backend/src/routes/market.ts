import { Router } from "express";
import { db } from "../db";

export const marketRouter = Router();

// GET /api/market
marketRouter.get("/", (_req, res) => {
  const rows = db
    .prepare("SELECT name, demand, trend FROM market_fields ORDER BY demand DESC")
    .all();
  res.json(rows);
});
