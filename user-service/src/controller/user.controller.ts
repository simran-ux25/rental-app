//src/controller/user.controller.ts
import { Response } from "express";
import { transporter } from "../utils/mailer.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { pool } from "../config/db.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export const getMe = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user!.userId;

    const [rows]: any = await pool.execute(
      `SELECT id, name, email, phone, role,
              account_status, email_verified,
              phone_verified, created_at, is_deleted
       FROM users
       WHERE id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = rows[0];

    // 🔒 Hard checks
    if (user.is_deleted) {
      return res.status(401).json({ message: "account is deleted" });
    }

    if (user.account_status !== "ACTIVE") {
      return res.status(403).json({
        message: "Account is not active",
      });
    }

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      account_status: user.account_status,
      email_verified: user.email_verified,
      phone_verified: user.phone_verified,
      created_at: user.created_at,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


const validateEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const requestEmailChange = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    let { newEmail } = req.body;

    if (!newEmail)
      return res.status(400).json({ message: "New email required" });

    newEmail = newEmail.trim().toLowerCase();

    if (!validateEmail(newEmail))
      return res.status(400).json({ message: "Invalid email format" });

    // Check uniqueness
    const [exists]: any = await pool.execute(
      `SELECT id FROM users WHERE email = ?`,
      [newEmail]
    );

    if (exists.length > 0)
      return res.status(409).json({ message: "Email already in use" });

    // Remove old pending requests
    await pool.execute(
      `DELETE FROM email_change_otps WHERE user_id = ?`,
      [userId]
    );

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    await pool.execute(
      `INSERT INTO email_change_otps
       (user_id, new_email, otp_hash, expires_at)
       VALUES (?, ?, ?, ?)`,
      [userId, newEmail, otpHash, expiresAt]
    );

    await transporter.sendMail({
      to: newEmail,
      subject: "Confirm Email Change",
      text: `Your OTP to change email is ${otp}. Expires in 5 minutes.`,
    });

    return res.json({ message: "OTP sent to new email." });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const verifyEmailChange = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { newEmail, otp } = req.body;

    if (!newEmail || !otp)
      return res.status(400).json({ message: "Invalid request" });

    const normalizedEmail = newEmail.trim().toLowerCase();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    // 🔐 Atomic OTP consume
    const [result]: any = await connection.execute(
      `UPDATE email_change_otps
       SET used_at = NOW()
       WHERE user_id = ?
       AND new_email = ?
       AND otp_hash = ?
       AND expires_at > NOW()
       AND used_at IS NULL`,
      [userId, normalizedEmail, otpHash]
    );

    if (result.affectedRows !== 1) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Update email
    await connection.execute(
      `UPDATE users SET email = ? WHERE id = ?`,
      [normalizedEmail, userId]
    );

    await connection.commit();
    connection.release();

    return res.json({ message: "Email updated successfully" });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
