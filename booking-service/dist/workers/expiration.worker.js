"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startExpirationWorker = startExpirationWorker;
const db_1 = require("../config/db");
const redis_1 = require("../config/redis");
function generateTimeSlots(startTime, endTime) {
    const slots = [];
    const current = new Date(startTime);
    while (current < endTime) {
        const slot = current.toISOString().slice(0, 13);
        slots.push(slot);
        current.setHours(current.getHours() + 1);
    }
    return slots;
}
async function expireBookings() {
    try {
        const [rows] = await db_1.pool.execute(`SELECT 
         BIN_TO_UUID(id) as booking_id,
         BIN_TO_UUID(vehicle_id) as vehicle_id,
         start_time,
         end_time
       FROM bookings
       WHERE status = 'LOCKED'
       AND expires_at < NOW()`);
        for (const booking of rows) {
            const slots = generateTimeSlots(new Date(booking.start_time), new Date(booking.end_time));
            for (const slot of slots) {
                await redis_1.redis.del(`lock:vehicle:${booking.vehicle_id}:${slot}`);
            }
            await db_1.pool.execute(`UPDATE bookings
         SET status = 'EXPIRED'
         WHERE id = UUID_TO_BIN(?)`, [booking.booking_id]);
            console.log(`Expired booking ${booking.booking_id}`);
        }
    }
    catch (err) {
        console.error("Expiration worker error:", err);
    }
}
function startExpirationWorker() {
    setInterval(expireBookings, 60000);
}
