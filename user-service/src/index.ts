//index.ts
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoute from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/users",authRoute);
app.use("/api/users",userRoutes);


app.post("/test", (req, res) => {
  res.json({ ok: true });
});



const PORT = process.env.PORT || 5000;

const startserver = async () =>{
    try {
        await connectDB();
        app.listen(PORT, () => {
      console.log(`User Service running on port ${PORT}`);
    });
}catch(err){
    console.error("Database connection failed:", err);
    process.exit(1);
}
};

startserver();