import { consumer } from "../config/kafka";
import { pool } from "../config/db";

export async function startBookingConfirmedConsumer() {

  await consumer.connect();

  await consumer.subscribe({
    topic: "booking.confirmed",
    fromBeginning: false
  });

  await consumer.run({
    eachMessage: async ({ message }) => {

      if (!message.value) return;

      const event = JSON.parse(message.value.toString());

      console.log("Booking confirmed event received:", event);

      const { vehicleId } = event;

      // update inventory
      await pool.execute(
  `UPDATE vehicles
   SET booking_status = 'BOOKED'
   WHERE id = UUID_TO_BIN(?)`,
  [event.vehicleId]
);
      console.log(`Vehicle ${vehicleId} marked as BOOKED`);

    }
  });
}