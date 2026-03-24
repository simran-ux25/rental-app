// import cron from "node-cron";
// import { pool } from "../config/db.js";

// export const startOtpCleanupJob = () => {
//   // Runs every 5 minutes
//   cron.schedule("*/5 * * * *", async () => {
//     try {
//       await pool.execute(
//         `DELETE FROM email_verification_otps
//          WHERE expires_at < NOW()`
//       );
//       console.log("Expired OTPs cleaned");
//     } catch (err) {
//       console.error("OTP cleanup failed:", err);
//     }
//   });
// };