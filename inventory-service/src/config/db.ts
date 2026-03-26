import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

/*
  ============================
  ENV VALIDATION (Fail Fast)
  ============================
*/

const requiredEnv = [
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

/*
  ============================
  CREATE CONNECTION POOL
  ============================
*/

export const pool = mysql.createPool({
  host: process.env.DB_HOST as string,
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  database: process.env.DB_NAME as string,

  waitForConnections: true,
  connectionLimit: 10,      // adjust based on load
  queueLimit: 0,            // unlimited queue
  enableKeepAlive: true,
});

/*
  ============================
  CONNECTION TEST + RETRY
  ============================
*/

const MAX_RETRIES = 5;
const RETRY_DELAY = 3000; // 3 seconds

export const connectDB = async () => {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const connection = await pool.getConnection();
      console.log("✅ Connected to MySQL");
      connection.release();
      return;
    } catch (error) {
      attempt++;
      console.error(
        `❌ MySQL connection failed (Attempt ${attempt}/${MAX_RETRIES})`,
        error
      );

      if (attempt >= MAX_RETRIES) {
        console.error("🚨 Max retries reached. Exiting...");
        process.exit(1);
      }

      await new Promise((res) => setTimeout(res, RETRY_DELAY));
    }
  }
};
