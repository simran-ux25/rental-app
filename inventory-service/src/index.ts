import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import vehicleRoutes from "./routes/vehicle.route";
import { pool } from "./config/db";
import { startBookingConfirmedConsumer } from "./events/bookingConfirmed.consumer";
dotenv.config();

const app = express();

/* ------------------------------
   Middlewares
------------------------------ */

app.use(express.json());

/* ------------------------------
   Health Check
------------------------------ */

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ message: "Inventory service running" });
});

/* ------------------------------
   Routes
------------------------------ */

app.use("/api/vehicles", vehicleRoutes);

/* ------------------------------
   404 Handler
------------------------------ */

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

/* ------------------------------
   Global Error Handler
------------------------------ */

app.use(
  (err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
);

/* ------------------------------
   Server Startup
------------------------------ */

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    // Test DB connection before starting server
    const connection = await pool.getConnection();
    connection.release();

    console.log("Database connected successfully");

    
      await startBookingConfirmedConsumer();
      
    app.listen(PORT, () => {
      console.log(`Inventory service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();