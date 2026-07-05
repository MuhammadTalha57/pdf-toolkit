import express from "express"
import { handleMergePdfs, handleOrganizePdf, handleSplitPdf } from "../controllers/pdf.controller.js";

const router = express.Router();

router.post("/merge", handleMergePdfs);
router.post("/split", handleSplitPdf);
router.post("/organize", handleOrganizePdf);

export default router;