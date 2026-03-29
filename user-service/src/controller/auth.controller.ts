//src/controller/auth.controller.ts
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { pool } from "../config/db.js";
import { transporter } from "../utils/mailer.js";
import jwt from "jsonwebtoken";

const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes for JWT
const REFRESH_TOKEN_DAYS = 7;      // number, used for date calculation
// ===============================
// Validation Helpers
// ===============================

const validateName = (name: string) =>
  /^[A-Za-z\u00C0-\u017F' -]{2,50}$/.test(name);

const validateEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePhone = (phone: string) =>
  /^[0-9]{10,15}$/.test(phone);

const validatePassword = (pwd: string) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,128}$/.test(
    pwd
  );

// ===============================
// REGISTER (Email Verification Required)
// ===============================
export const register = async (req: Request, res: Response) => {
  try {
    let { name, date_of_birth, email, phone, password, role } = req.body;

    if (!name || !date_of_birth || !email || !phone || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    name = name.trim();
    email = email.trim().toLowerCase();
    phone = phone.trim();

    if (!validateName(name))
      return res.status(400).json({ message: "Invalid name format" });

    if (!validateEmail(email))
      return res.status(400).json({ message: "Invalid email" });

    if (!validatePhone(phone))
      return res.status(400).json({ message: "Invalid phone number" });

    if (!validatePassword(password))
      return res.status(400).json({
        message:
          "Password must be 8+ chars with uppercase, lowercase, digit & special char",
      });

    if (!["OWNER", "RENTER"].includes(role))
      return res.status(400).json({ message: "Invalid role" });

    const dob = new Date(date_of_birth);

    if (isNaN(dob.getTime()))
      return res.status(400).json({ message: "Invalid date_of_birth format" });

    if (dob > new Date())
      return res.status(400).json({ message: "Date of birth cannot be future date" });

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;

    if (age < 18)
      return res.status(400).json({ message: "User must be at least 18 years old" });

    const hashedPassword = await bcrypt.hash(password, 12);

    const connection = await pool.getConnection();

    try {
      const [result]: any = await connection.execute(
        `INSERT INTO users
         (name, date_of_birth, email, phone, password_hash, role, account_status, email_verified)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', FALSE)`,
        [name, date_of_birth, email, phone, hashedPassword, role]
      );

      const userId = result.insertId;

      const rawToken = crypto.randomBytes(64).toString("hex");

      const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await connection.execute(
        `INSERT INTO email_verification_tokens
         (user_id, token_hash, expires_at)
         VALUES (?, ?, ?)`,
        [userId, tokenHash, expiresAt]
      );

      const verificationLink =
        `${process.env.BACKEND_URL}/auth/verify-email?token=${rawToken}`;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Verify Your Email",
        html: `
          <h2>Email Verification</h2>
          <p>Click below to verify your account:</p>
          <a href="${verificationLink}">${verificationLink}</a>
          <p>This link expires in 24 hours.</p>
        `,
      });

      const response: any = {
        success: true,
        message: "Registration successful. Please verify your email.",
        user: {
          id: userId,
          name,
          date_of_birth,
          email,
          phone,
          role,
          account_status: "ACTIVE",
          email_verified: false
        }
      };

      // 🔐 Dev only token exposure
      if (process.env.NODE_ENV === "development") {
        response.verificationToken = rawToken;
        response.verificationLink = verificationLink;
      }

      return res.status(201).json(response);

    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          message: "Email or phone already registered.",
        });
      }
      throw err;
    } finally {
      connection.release();
    }

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Invalid token" });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const [rows]: any = await pool.execute(
      `SELECT * FROM email_verification_tokens
       WHERE token_hash = ?
       AND expires_at > NOW()
       AND used = FALSE`,
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const record = rows[0];

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    await conn.execute(
      `UPDATE users
       SET email_verified = TRUE
       WHERE id = ?`,
      [record.user_id]
    );

    await conn.execute(
      `UPDATE email_verification_tokens
       SET used = TRUE
       WHERE id = ?`,
      [record.id]
    );

    await conn.commit();
    conn.release();

    return res.json({ message: "Email verified successfully" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    let { email, password } = req.body;

    // Basic validation
    if (!email || !password)
      return res.status(400).json({ message: "Invalid credentials" });

    email = email.trim().toLowerCase();

    const [rows]: any = await pool.execute(
      `SELECT id, password_hash, account_status, email_verified
       FROM users
       WHERE email = ?`,
      [email]
    );

    if (rows.length === 0)
      return res.status(401).json({ message: "Invalid credentials" });

    const user = rows[0];

    // 🔐 Lifecycle check BEFORE bcrypt (avoid wasting CPU)
    if (user.account_status !== "ACTIVE" || !user.email_verified)
      return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    // 🔐 Remove any previous OTPs (only 1 valid at a time)
    await pool.execute(
      `DELETE FROM login_otps WHERE user_id = ?`,
      [user.id]
    );

    // 🔐 Generate new OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    await pool.execute(
      `INSERT INTO login_otps (user_id, otp_hash, expires_at)
       VALUES (?, ?, ?)`,
      [user.id, otpHash, expiresAt]
    );

    await transporter.sendMail({
      to: email,
      subject: "Login OTP",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent to your registered email.",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyLoginOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ message: "Invalid request" });

    const normalizedEmail = email.trim().toLowerCase();

    const [users]: any = await pool.execute(
      `SELECT id, role, account_status, email_verified
       FROM users
       WHERE email = ?`,
      [normalizedEmail]
    );

    if (users.length === 0)
      return res.status(400).json({ message: "Invalid request" });

    const user = users[0];

    if (user.account_status !== "ACTIVE" || !user.email_verified)
      return res.status(403).json({ message: "Account not eligible" });

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // 🔐 Atomic OTP consumption
    const [result]: any = await pool.execute(
      `UPDATE login_otps
       SET used_at = NOW()
       WHERE user_id = ?
       AND otp_hash = ?
       AND expires_at > NOW()
       AND used_at IS NULL`,
      [user.id, otpHash]
    );

    if (result.affectedRows !== 1)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    // ===============================
    // 🔐 Issue Access Token
    // ===============================

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" }
    );

    // ===============================
    // 🔐 Generate Refresh Token
    // ===============================

    const refreshTokenRaw = crypto.randomBytes(64).toString("hex");

    const refreshHash = crypto
      .createHash("sha256")
      .update(refreshTokenRaw)
      .digest("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await pool.execute(
      `INSERT INTO refresh_tokens
       (user_id, token_hash, expires_at)
       VALUES (?, ?, ?)`,
      [user.id, refreshHash, expiresAt]
    );

    return res.status(200).json({
      success: true,
      accessToken,
      refreshToken: refreshTokenRaw,
      expiresIn: 900
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== "string") {
      return res.status(400).json({ message: "Invalid request" });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      // 🔐 Lock row to prevent race conditions
      const [rows]: any = await conn.execute(
        `SELECT * FROM refresh_tokens
         WHERE token_hash = ?
         FOR UPDATE`,
        [tokenHash]
      );

      if (rows.length === 0) {
        await conn.rollback();
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      const tokenRecord = rows[0];

      // 🚨 REUSE DETECTION
      if (tokenRecord.revoked) {
        // Possible token theft → revoke all sessions
        await conn.execute(
          `UPDATE refresh_tokens
           SET revoked = TRUE
           WHERE user_id = ?`,
          [tokenRecord.user_id]
        );

        await conn.commit();

        return res.status(403).json({
          message: "Session compromised. Please login again."
        });
      }

      // ❌ Expired token
      if (new Date(tokenRecord.expires_at) < new Date()) {
        await conn.execute(
          `UPDATE refresh_tokens
           SET revoked = TRUE
           WHERE id = ?`,
          [tokenRecord.id]
        );

        await conn.commit();

        return res.status(401).json({ message: "Expired refresh token" });
      }

      // 🔐 Generate new refresh token
      const newRaw = crypto.randomBytes(64).toString("hex");

      const newHash = crypto
        .createHash("sha256")
        .update(newRaw)
        .digest("hex");

      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + REFRESH_TOKEN_DAYS);

      // 🔐 Insert new token
      await conn.execute(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES (?, ?, ?)`,
        [tokenRecord.user_id, newHash, newExpiry]
      );

      // 🔐 Revoke old token + link it
      await conn.execute(
        `UPDATE refresh_tokens
         SET revoked = TRUE,
             replaced_by_token_hash = ?
         WHERE id = ?`,
        [newHash, tokenRecord.id]
      );

      // 🔐 Issue access token
      const accessToken = jwt.sign(
        { userId: tokenRecord.user_id },
        process.env.JWT_SECRET as string,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      await conn.commit();

      return res.status(200).json({
        success: true,
        accessToken,
        refreshToken: newRaw,
        expiresIn: 900
      });

    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== "string") {
      return res.status(400).json({ message: "Invalid request" });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await pool.execute(
      `UPDATE refresh_tokens
       SET revoked = TRUE
       WHERE token_hash = ?`,
      [tokenHash]
    );

    return res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};