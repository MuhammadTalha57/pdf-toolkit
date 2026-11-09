import express from "express";
import {
    handleLogin,
    handleLogout,
    handleMe,
    handleSignup,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/signup", handleSignup);
router.post("/login", handleLogin);
router.post("/logout", handleLogout);
router.get("/me", requireAuth, handleMe);

export default router;
