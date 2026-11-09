import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes.js";
import documentRoutes from "./routes/document.routes.js";
import pdfRoutes from "./routes/pdf.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { getEnv } from "./config/env.js";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(
    cors({
        origin: getEnv().FRONTEND_ORIGIN,
        credentials: true,
    }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: "Too many requests, please try again later.",
    standardHeaders: true,
});

app.use(limiter);

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/documents", documentRoutes);
app.use("/pdf", pdfRoutes);

app.get("/", (req, res) => res.send("pdf-toolkit-server running"));

app.use(errorMiddleware);

export default app;
