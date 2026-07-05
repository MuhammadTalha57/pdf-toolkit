import express from "express"
import { handleMergePdfs, handleOrganizePdf, handleSplitPdf } from "../controllers/pdf.controller.js";
import { uploadMiddleware } from "../middlewares/upload.middleware.js";
import { handleUpload } from "@vercel/blob/client";

const router = express.Router();

router.post("/upload", uploadMiddleware.single("file"), handleUpload)
router.post("/merge", handleMergePdfs);
router.post("/split", handleSplitPdf);
router.post("/organize", handleOrganizePdf);

export default router;