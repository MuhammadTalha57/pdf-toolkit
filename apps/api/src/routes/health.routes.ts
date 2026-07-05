import express from 'express'
import { checkHealth } from '../controllers/health.controller.js';

const router = express.Router();

router.get("/check", checkHealth);

export default router