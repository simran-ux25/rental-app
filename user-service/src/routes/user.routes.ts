//src/routes/user.routes.ts
import { Router } from "express";
import { getMe,verifyEmailChange,requestEmailChange } from "../controller/user.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/me", authenticate, getMe);

router.post("/request-email-change",authenticate,requestEmailChange);
router.post("/verify-email-change",authenticate,verifyEmailChange);


export default router;