import "dotenv/config"
import express from "express";
import cors from "cors";
import pdfRoutes from "./routes/pdf.routes.js"
import rateLimit from "express-rate-limit";
import { errorMiddleware } from "./middlewares/error.middleware.js";

const FRONTEND_URL = process.env.FRONTEND_URL;

const app = express();
app.use(cors({origin: FRONTEND_URL}));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minutes
  max: 100,
  message: "Too many requests, Please try again later",
  standardHeaders: true,
})

app.use(limiter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});


app.use("/pdf", pdfRoutes);

app.get("/", (req, res) => res.send("pdf-toolkit-server running"));

app.use(errorMiddleware);

export default app;