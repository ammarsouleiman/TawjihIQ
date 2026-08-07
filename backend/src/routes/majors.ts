import { Router } from "express";
import { db } from "../db";

export const majorsRouter = Router();

type MajorRow = {
  id: string;
  name: string;
  match: number;
  category: string;
  why: string;
  difficulty: string;
  localDemand: number;
  globalDemand: number;
  salary: string;
  duration: string;
  overview: string;
  personality: string;
  skills: string;
  careers: string;
  subjects: string;
  universities: string;
  pros: string;
  cons: string;
  courses: string;
};

function parseMajor(row: MajorRow) {
  return {
    ...row,
    skills: JSON.parse(row.skills) as string[],
    careers: JSON.parse(row.careers) as string[],
    subjects: JSON.parse(row.subjects) as string[],
    universities: JSON.parse(row.universities) as string[],
    pros: JSON.parse(row.pros) as string[],
    cons: JSON.parse(row.cons) as string[],
    courses: JSON.parse(row.courses) as string[],
  };
}

// GET /api/majors
majorsRouter.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM majors ORDER BY match DESC").all() as MajorRow[];
  res.json(rows.map(parseMajor));
});

// GET /api/majors/:id
majorsRouter.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM majors WHERE id = ?").get(req.params.id) as MajorRow | undefined;
  if (!row) {
    return res.status(404).json({ error: "Major not found" });
  }
  res.json(parseMajor(row));
});
