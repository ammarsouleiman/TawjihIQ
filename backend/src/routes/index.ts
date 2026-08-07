import { Router } from "express";
import { aiRouter } from "./ai";
import { authRouter } from "./auth";
import { configRouter } from "./config";
import { majorsRouter } from "./majors";
import { marketRouter } from "./market";
import { notificationsRouter } from "./notifications";
import { scholarshipsRouter } from "./scholarships";

export const router = Router();

router.use("/auth", authRouter);
router.use("/ai", aiRouter);
router.use("/majors", majorsRouter);
router.use("/market", marketRouter);
router.use("/scholarships", scholarshipsRouter);
router.use("/config", configRouter);
router.use("/notifications", notificationsRouter);
