import { Router } from "express";
import { adminRouter } from "./admin";
import { aiRouter } from "./ai";
import { authRouter } from "./auth";
import { configRouter } from "./config";
import { marketRouter } from "./market";
import { notificationsRouter } from "./notifications";
import { ownerRouter } from "./owner";
import { scholarshipsRouter } from "./scholarships";

export const router = Router();

router.use("/auth", authRouter);
router.use("/owner", ownerRouter);
router.use("/admin", adminRouter);
router.use("/ai", aiRouter);
router.use("/market", marketRouter);
router.use("/scholarships", scholarshipsRouter);
router.use("/config", configRouter);
router.use("/notifications", notificationsRouter);
