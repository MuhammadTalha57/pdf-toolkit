import express from "express";
import {
    handleMergePdfs,
    handleOrganizePdf,
    handleSplitPdf,
    handleUploadPdf,
} from "../controllers/pdf.controller.js";
import { uploadMiddleware } from "../middlewares/upload.middleware.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/upload", requireAuth, uploadMiddleware.single("file"), handleUploadPdf);
router.post("/merge", requireAuth, handleMergePdfs);
router.post("/split", requireAuth, handleSplitPdf);
router.post("/organize", requireAuth, handleOrganizePdf);

export default router;
