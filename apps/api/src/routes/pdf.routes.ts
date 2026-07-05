import express from "express"
import { handleMergePdfs, handleOrganizePdf, handleSplitPdf, handleUploadPdf } from "../controllers/pdf.controller.js";
import { uploadMiddleware } from "../middlewares/upload.middleware.js";


const router = express.Router();

router.post("/upload", uploadMiddleware.single("file"), handleUploadPdf)
router.post("/merge", handleMergePdfs);
router.post("/split", handleSplitPdf);
router.post("/organize", handleOrganizePdf);

export default router;