import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { router as apiRouter } from "./routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust Railway reverse proxy when deployed.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

function parseAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS ?? process.env.FRONTEND_URL ?? "";
  return raw
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS origin not allowed"));
    },
  })
);
app.use(express.json());

app.use("/api", apiRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "TawjihIQ API" });
});

app.listen(PORT, () => {
  console.log(`TawjihIQ backend running on port ${PORT}`);
});
