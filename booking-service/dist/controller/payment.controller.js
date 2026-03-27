"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payController = payController;
const booking_service_1 = require("../service/booking.service");
async function payController(req, res) {
    try {
        const userId = req.user?.userId;
        const bookingId = req.query.bookingId;
        if (!bookingId) {
            return res.status(400).json({ success: false, message: "bookingId required" });
        }
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        await (0, booking_service_1.confirmBooking)(bookingId, String(userId));
        res.json({ success: true, message: "Payment successful. Booking confirmed" });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
