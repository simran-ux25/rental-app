//workers/expiration.worker.ts
import { pool } from "../config/db";
import { redis } from "../config/redis";

// ✅ same helper used in service (keep logic identical)
function generateTimeSlots(startTime: Date, endTime: Date): string[] {
  const slots: string[] = [];
  const current = new Date(startTime);

  while (current < endTime) {
    const slot = current.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    slots.push(slot);
    current.setHours(current.getHours() + 1);
  }

  return slots;
}

async function expireBookings() {
  try {

    // ✅ fetch time range also (important)
    const [rows]: any = await pool.execute(
      `SELECT 
         BIN_TO_UUID(id) as booking_id,
         BIN_TO_UUID(vehicle_id) as vehicle_id,
         start_time,
         end_time
       FROM bookings
       WHERE status = 'LOCKED'
       AND expires_at < NOW()`
    );

    for (const booking of rows) {

      // ✅ generate slots for this booking
      const slots = generateTimeSlots(
        new Date(booking.start_time),
        new Date(booking.end_time)
      );

      // ✅ delete ALL slot locks
      for (const slot of slots) {
        await redis.del(`lock:vehicle:${booking.vehicle_id}:${slot}`);
      }

      // ✅ mark booking expired (use UUID_TO_BIN now)
      await pool.execute(
        `UPDATE bookings
         SET status = 'EXPIRED'
         WHERE id = UUID_TO_BIN(?)`,
        [booking.booking_id]
      );

      console.log(`Expired booking ${booking.booking_id}`);
    }

  } catch (err) {
    console.error("Expiration worker error:", err);
  }
}

export function startExpirationWorker() {
  setInterval(expireBookings, 60000); // every 1 minute
}