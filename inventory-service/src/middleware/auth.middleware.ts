import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: string;
        role: string;
      };
    }
  }
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
      console.log("requireAuth hit");

    const authHeader = req.headers.authorization;

     console.log("Auth header:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = parts[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET not configured");
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;

console.log("Decoded JWT:", decoded);

if (!decoded.userId || !decoded.role) {
  return res.status(401).json({ error: "Invalid token payload" });
}

req.user = {
  user_id: String(decoded.userId),
  role: String(decoded.role),
};

    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

export const requireOwner = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.user.role !== "OWNER") {
    return res.status(403).json({ error: "Access denied not owner" });
  }

  next();
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Access denied" });
  }

  next();
};