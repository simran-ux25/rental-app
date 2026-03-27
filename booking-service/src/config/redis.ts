//src/config/redis.ts
import { createClient } from "redis";

export const redis = createClient({
  url: "redis://localhost:6379"
});

redis.on("error", (err: unknown) => {
  console.error("Redis error", err);
});

export async function connectRedis() {
  await redis.connect();
}