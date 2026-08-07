import { Router } from "express";
import { db } from "../db";

export const scholarshipsRouter = Router();

// GET /api/scholarships
scholarshipsRouter.get("/", (_req, res) => {
  const rows = db
    .prepare("SELECT id, title, org, type, deadline, country, tag FROM scholarships")
    .all();
  res.json(rows);
});
