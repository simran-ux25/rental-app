import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { createBookingController, cancelBookingController } from "../controller/booking.controller";
import { payController } from "../controller/payment.controller";

const router = Router();

// Payment — authenticated so we can verify the booker owns this booking
router.get("/payments/pay", authenticate, payController);

// Booking routes — all require valid JWT
router.post("/create-booking",          authenticate, createBookingController);
router.post("/:id/cancel", authenticate, cancelBookingController);

export default router;