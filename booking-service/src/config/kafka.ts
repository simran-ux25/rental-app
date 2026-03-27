//src/config/kafka.ts
import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "booking-service",
  brokers: ["localhost:9092"]
});

export const producer = kafka.producer();