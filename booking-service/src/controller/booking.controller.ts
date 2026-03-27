//bookingcontroller.ts 
import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authenticate";
import { createBooking, cancelBooking } from "../service/booking.service";

export async function createBookingController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { vehicleId, startTime, endTime } = req.body;

    if (!vehicleId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "vehicleId, startTime and endTime are required"
      });
    }

    const result = await createBooking(String(userId), vehicleId, startTime, endTime);

    res.json({
      success: true,
      bookingId: result.bookingId,
      paymentUrl: result.paymentUrl
    });

  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function cancelBookingController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.userId;
    const id = req.params.id;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking id" });
    }

    await cancelBooking(id, String(userId));

    res.json({ success: true, message: "Booking cancelled" });

  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}