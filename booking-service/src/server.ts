import dotenv from "dotenv";
dotenv.config();

import express from "express";
import routes from "./router/routes";
import { connectRedis } from "./config/redis";
import { startExpirationWorker } from "./workers/expiration.worker";
import { producer } from "./config/kafka";

const app = express();

// Middleware
app.use(express.json());

// ✅ Prefix all routes with /api
app.use("/api/bookings", routes);

async function start() {
  try {
    await connectRedis();
    console.log("✅ Redis connected");

    startExpirationWorker();
    console.log("⏳ Expiration worker started");

    await producer.connect();
    console.log("✅ Kafka producer connected");

    const PORT = process.env.PORT || 5003;

    app.listen(PORT, () => {
      console.log(`🚀 Booking service running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Failed to start booking service:", error);
    process.exit(1);
  }
}

start();