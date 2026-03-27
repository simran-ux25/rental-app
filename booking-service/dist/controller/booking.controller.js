"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBookingController = createBookingController;
exports.cancelBookingController = cancelBookingController;
const booking_service_1 = require("../service/booking.service");
async function createBookingController(req, res) {
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
        const result = await (0, booking_service_1.createBooking)(String(userId), vehicleId, startTime, endTime);
        res.json({
            success: true,
            bookingId: result.bookingId,
            paymentUrl: result.paymentUrl
        });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function cancelBookingController(req, res) {
    try {
        const userId = req.user?.userId;
        const id = req.params.id;
        if (!id || Array.isArray(id)) {
            return res.status(400).json({ success: false, message: "Invalid booking id" });
        }
        await (0, booking_service_1.cancelBooking)(id, String(userId));
        res.json({ success: true, message: "Booking cancelled" });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
