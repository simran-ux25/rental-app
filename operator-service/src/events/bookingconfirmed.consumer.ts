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

        // 🔥 REQUIRED FIELD VALIDATION
        if (!data.bookingId) {
          console.error("❌ bookingId missing in event");
          return;
        }

        if (!data.vehicleId) {
          console.error("❌ vehicleId missing in event");
          return;
        }

        // 🔥 HANDLE NAMING MISMATCH
        const startTime = data.startTime || data.starttime;
        const endTime = data.endTime || data.endtime;

        if (!startTime || !endTime) {
          console.error("❌ startTime/endTime missing in event");
          return;
        }

        // 🔥 INSERT INTO DB
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