//src/routes/auth.routes.ts
import { Router } from "express";
import { register, login, verifyEmail,verifyLoginOtp} from "../controller/auth.controller.js";


const router = Router();

console.log("Auth routes loaded");
router.post("/register", register);
router.post("/login", login);

 router.get("/verify-email", verifyEmail);
 router.post("/verify-login-otp",verifyLoginOtp)

export default router;
