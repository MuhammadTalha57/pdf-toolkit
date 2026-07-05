import express from 'express';

import healthRoutes from "./routes/health.routes.js"

const app = express();


app.use("/health", healthRoutes);

export default app;