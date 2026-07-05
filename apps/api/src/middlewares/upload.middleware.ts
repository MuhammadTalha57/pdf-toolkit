import multer from "multer";

export const uploadMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 4 * 1024 * 1024,
    },
    fileFilter: (req, file, callback) => {
        if(file.mimetype !== "application/pdf") {
            callback(new Error("Only PDF files are allowed."));
            return;
        }
        callback(null, true);
    }
})