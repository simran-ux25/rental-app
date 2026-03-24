//src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload as DefaultJwtPayload } from "jsonwebtoken";

interface AccessTokenPayload extends DefaultJwtPayload {
  userId: number;
  role: "OWNER" | "RENTER";
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    role: "OWNER" | "RENTER";
  };
}

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET;

if (!ACCESS_TOKEN_SECRET) {
  throw new Error("ACCESS_TOKEN_SECRET is not defined");
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(
      token,
      ACCESS_TOKEN_SECRET
    ) as unknown;

    if (typeof decoded !== "object" || decoded === null) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const payload = decoded as AccessTokenPayload;

    if (!payload.userId || !payload.role) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = {
      userId: payload.userId,
      role: payload.role,
    };

    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};