//src/config/kafka.ts
import { Kafka } from "kafkajs";
import { createInspection } from "../services/inspection.service";

const kafka = new Kafka({
  clientId: "operator-service",
  brokers: ["localhost:9092"]
});

const consumer = kafka.consumer({ groupId: "operator-group" });

export const startConsumer = async () => {
  await consumer.connect();
  console.log("✅ Kafka connected");

  await consumer.subscribe({
    topic: "booking.confirmed",
    fromBeginning: false
  });

  console.log("📡 Subscribed to topic: booking.confirmed");

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const rawValue = message.value?.toString();

        console.log("📩 RAW MESSAGE:", rawValue);

        if (!rawValue) {
          console.log("⚠️ Empty message received");
          return;
        }

        const data = JSON.parse(rawValue);

        console.log("📦 PARSED EVENT:", data);

        // ✅ REQUIRED FIELDS
        if (!data.bookingId) {
          console.error("❌ bookingId missing");
          return;
        }

        if (!data.vehicleId) {
          console.error("❌ vehicleId missing");
          return;
        }

        if (!data.starttime || !data.endtime) {
          console.error("❌ starttime/endtime missing");
          return;
        }

        // ✅ NO CONVERSION NEEDED (already MySQL format)
        const rawStart = data.starttime;
const rawEnd = data.endtime;

if (!rawStart || !rawEnd) {
  console.error("❌ starttime/endtime missing");
  return;
}

// 🔥 Convert ISO → MySQL DATETIME
const startDate = new Date(rawStart);
const endDate = new Date(rawEnd);

if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
  console.error("❌ Invalid date format");
  return;
}

const startTime = startDate
  .toISOString()
  .slice(0, 19)
  .replace("T", " ");

const endTime = endDate
  .toISOString()
  .slice(0, 19)
  .replace("T", " ");

  
        await createInspection({
          bookingId: data.bookingId,
          vehicleId: data.vehicleId,
          startTime,
          endTime
        });

        console.log("✅ Inspection stored in DB:", data.bookingId);

      } catch (error: any) {
        console.error("❌ Kafka consumer error:", error.message);
      }
    }
  });
};