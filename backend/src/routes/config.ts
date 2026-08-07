import { Router } from "express";
import { chatSuggestionsSeed, fieldChipsSeed, skillsListSeed } from "../db/seed-data";

export const configRouter = Router();

// GET /api/config/skills — options for the assessment "rate your skills" step.
configRouter.get("/skills", (_req, res) => {
  res.json(skillsListSeed);
});

// GET /api/config/fields — field-of-interest chips.
configRouter.get("/fields", (_req, res) => {
  res.json(fieldChipsSeed);
});

// GET /api/config/chat-suggestions — starter prompts for the AI chat.
configRouter.get("/chat-suggestions", (_req, res) => {
  res.json(chatSuggestionsSeed);
});
