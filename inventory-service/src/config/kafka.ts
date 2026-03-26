import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "inventory-service",
  brokers: ["localhost:9092"]
});

export const consumer = kafka.consumer({
  groupId: "inventory-service-group"
});