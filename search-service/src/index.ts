import express from "express";
import dotenv from "dotenv";
import searchRoutes from "./routes/search.routes.js";

dotenv.config();

const app = express();

app.use(express.json());

app.use("/api/search", searchRoutes);

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`Search Service running on port ${PORT}`);
});