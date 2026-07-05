import type { ErrorRequestHandler } from "express";
import { MulterError } from "multer";


export const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
    if(err instanceof MulterError) {
        if(err.code === "LIMIT_FILE_SIZE") {
            res.status(413).json({error: "File is too large. Max size is 4MB"});
            return;
        }
        res.status(400).json({error: err.message});
        return;
    }

    if(err instanceof Error) {
        res.status(400).json({error: err.message});
        return;
    }

    console.error("Unexpected error:", err);
    res.status(500).json({error: "Something went wront on our end"});
}