//bookingservice.ts
import { pool } from "../config/db";
import { redis } from "../config/redis";
import { v4 as uuid } from "uuid";
import { publishBookingConfirmed } from "../events/publishbookingconfirm";

function generateTimeSlots(startTime: Date, endTime: Date): string[] {
  const slots: string[] = [];
  const current = new Date(startTime);

  while (current < endTime) {
    const year  = current.getUTCFullYear();
    const month = String(current.getUTCMonth() + 1).padStart(2, "0");
    const day   = String(current.getUTCDate()).padStart(2, "0");
    const hour  = String(current.getUTCHours()).padStart(2, "0");
    slots.push(`${year}-${month}-${day}T${hour}`);
    current.setUTCHours(current.getUTCHours() + 1);
  }

  return slots;
}

// Validate user exists and is active in rental_auth before creating a booking
async function assertUserExists(userId: string): Promise<void> {
  const [rows]: any = await pool.execute(
    `SELECT id FROM rental_auth.users
     WHERE id = ? AND account_status = 'ACTIVE'
     LIMIT 1`,
    [userId]
  );

  if (rows.length === 0) {
    throw new Error("User not found or account is not active");
  }
}

export async function createBooking(
  userId:    string,
  vehicleId: string,
  startTime: Date,
  endTime:   Date
): Promise<{ bookingId: string; paymentUrl: string }> {

  // Validate user exists before doing anything else
  await assertUserExists(userId);

  const bookingId  = uuid();
  const startDate  = new Date(startTime);
  const endDate    = new Date(endTime);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Invalid date format");
  }

  if (startDate >= endDate) {
    throw new Error("startTime must be less than endTime");
  }

  const start = startDate.toISOString().slice(0, 19).replace("T", " ");
  const end   = endDate.toISOString().slice(0, 19).replace("T", " ");
  const slots = generateTimeSlots(startDate, endDate);

  if (slots.length === 0) throw new Error("Invalid booking duration");

  console.log("CREATE slots:", slots);

  const acquiredSlots: string[] = [];

  for (const slot of slots) {
    const lockKey = `lock:vehicle:${vehicleId}:${slot}`;
    const lock = await redis.set(lockKey, bookingId, { NX: true, EX: 900 });

    if (!lock) {
      for (const s of acquiredSlots) {
        await redis.del(`lock:vehicle:${vehicleId}:${s}`);
      }
      throw new Error("Vehicle already booked for selected time");
    }

    acquiredSlots.push(slot);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const [existing]: any = await connection.execute(
      `SELECT id FROM bookings
       WHERE vehicle_id = UUID_TO_BIN(?)
       AND (status = 'CONFIRMED' OR (status = 'LOCKED' AND expires_at > NOW()))
       AND NOT (end_time <= ? OR start_time >= ?)
       LIMIT 1`,
      [vehicleId, start, end]
    );

    if (existing.length > 0) throw new Error("Vehicle already booked");

    await connection.execute(
      `INSERT INTO bookings (id, user_id, vehicle_id, status, expires_at, start_time, end_time)
       VALUES (UUID_TO_BIN(?), ?, UUID_TO_BIN(?), 'LOCKED', ?, ?, ?)`,
      [bookingId, userId, vehicleId, expiresAt, start, end]
    );

    await connection.commit();

    return { bookingId, paymentUrl: `/payments/pay?bookingId=${bookingId}` };

  } catch (err) {
    await connection.rollback();
    for (const slot of slots) {
      await redis.del(`lock:vehicle:${vehicleId}:${slot}`);
    }
    throw err;
  } finally {
    connection.release();
  }
}

export async function cancelBooking(bookingId: string, userId: string) {
  const [rows]: any = await pool.execute(
    `SELECT BIN_TO_UUID(vehicle_id) AS vehicle_id, user_id, status, start_time, end_time
     FROM bookings
     WHERE id = UUID_TO_BIN(?)`,
    [bookingId]
  );

  if (rows.length === 0) throw new Error("Booking not found");

  const booking = rows[0];

  // Ownership check — only the user who made the booking can cancel it
  if (String(booking.user_id) !== String(userId)) {
    throw new Error("Unauthorized — this booking does not belong to you");
  }

  if (!["CONFIRMED", "LOCKED"].includes(booking.status)) {
    throw new Error("Only confirmed or locked bookings can be cancelled");
  }

  await pool.execute(
    `UPDATE bookings SET status = 'CANCELLED' WHERE id = UUID_TO_BIN(?)`,
    [bookingId]
  );

  return true;
}

export async function confirmBooking(bookingId: string, userId: string) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows]: any = await connection.execute(
      `SELECT
         BIN_TO_UUID(vehicle_id) as vehicle_id,
         user_id,
         status,
         expires_at,
         start_time,
         end_time
       FROM bookings
       WHERE id = UUID_TO_BIN(?)
       LIMIT 1`,
      [bookingId]
    );

    if (rows.length === 0) throw new Error("Booking not found");

    const booking = rows[0];

    // Ownership check — only the user who made the booking can pay for it
    if (String(booking.user_id) !== String(userId)) {
      throw new Error("Unauthorized — this booking does not belong to you");
    }

    if (booking.status !== "LOCKED") throw new Error("Booking cannot be confirmed");
    if (new Date(booking.expires_at) < new Date()) throw new Error("Booking expired");

    const startUTC = new Date(booking.start_time + "Z");
    const endUTC   = new Date(booking.end_time + "Z");
    const slots    = generateTimeSlots(startUTC, endUTC);

    if (slots.length === 0) throw new Error("Invalid booking slots");

    for (const slot of slots) {
      const lockKey  = `lock:vehicle:${booking.vehicle_id}:${slot}`;
      const lockOwner = await redis.get(lockKey);
      if (lockOwner !== bookingId) throw new Error("Vehicle lock lost");
    }

    await connection.execute(
      `UPDATE bookings SET status = 'CONFIRMED' WHERE id = UUID_TO_BIN(?)`,
      [bookingId]
    );

    await connection.commit();

    await publishBookingConfirmed({
      bookingId,
      vehicleId:  booking.vehicle_id,
      userId:     booking.user_id,
      starttime:  booking.start_time,
      endtime:    booking.end_time,
    });

    for (const slot of slots) {
      await redis.del(`lock:vehicle:${booking.vehicle_id}:${slot}`);
    }

    return true;

  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}