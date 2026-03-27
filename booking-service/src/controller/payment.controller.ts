//paymentcontroller.ts
import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authenticate";
import { confirmBooking } from "../service/booking.service";

export async function payController(req: AuthenticatedRequest, res: Response) {
  try {
    const userId  = req.user?.userId;
    const bookingId = req.query.bookingId as string;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: "bookingId required" });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    await confirmBooking(bookingId, String(userId));

    res.json({ success: true, message: "Payment successful. Booking confirmed" });

  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}