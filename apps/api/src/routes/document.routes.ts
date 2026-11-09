import express from "express";
import {
    handleDownloadDocument,
    handleListDocuments,
} from "../controllers/document.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", requireAuth, handleListDocuments);
router.get("/:id/download", requireAuth, handleDownloadDocument);

export default router;
