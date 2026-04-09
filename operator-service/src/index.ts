//index.ts
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import inspectionRoutes from "./routes/inspection.routes.js";
import { minioClient, BUCKET } from "./storage/minioclient.js";
import { startConsumer } from "./config/kafka.js"

const app = express();

app.use(express.json());
app.use("api/operators", inspectionRoutes);

const PORT = 5004;

// Initialize MinIO bucket
const initBucket = async () => {
  try {
    const exists = await minioClient.bucketExists(BUCKET);

    if (!exists) {
      await minioClient.makeBucket(BUCKET);
      console.log("Bucket created:", BUCKET);
    } else {
      console.log("Bucket exists:", BUCKET);
    }
  } catch (error) {
    console.error("Bucket init error:", error);
  }
};

// Start everything
const startServer = async () => {
  await initBucket();

  // 🔥 START KAFKA CONSUMER
  await startConsumer();

  app.listen(PORT, () => {
    console.log(`Operator service running on port ${PORT}`);
  });
};

startServer();

export default app;