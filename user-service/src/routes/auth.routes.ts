//src/routes/auth.routes.ts
import { Router } from "express";
import { 
  register, 
  login, 
  verifyEmail,
  verifyLoginOtp,
  refreshToken,
  logout
} from "../controller/auth.controller.js";

const router = Router();

console.log("Auth routes loaded");

// ===============================
// AUTH FLOW
// ===============================
router.post("/register", register);
router.post("/login", login);
router.get("/verify-email", verifyEmail);
router.post("/verify-login-otp", verifyLoginOtp);

// ===============================
// SESSION MANAGEMENT
// ===============================
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

export default router;