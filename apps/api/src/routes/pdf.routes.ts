import express from "express"
import { handleDeleteFile, handleGetFile, handleMergePdfs, handleOrganizePdf, handlePutFile, handleSplitPdf, handleUploadPdf } from "../controllers/pdf.controller.js";
import { uploadMiddleware } from "../middlewares/upload.middleware.js";


const router = express.Router();

router.post("/upload", uploadMiddleware.single("file"), handleUploadPdf)
router.get("/file", handleGetFile);
router.put("/file", uploadMiddleware.single("file"), handlePutFile);
router.delete("/file", handleDeleteFile);
router.post("/merge", handleMergePdfs);
router.post("/split", handleSplitPdf);
router.post("/organize", handleOrganizePdf);

export default router;