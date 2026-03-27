"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET;
if (!ACCESS_TOKEN_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
}
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, ACCESS_TOKEN_SECRET);
        if (typeof decoded !== "object" || decoded === null) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const payload = decoded;
        if (!payload.userId || !payload.role) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        req.user = { userId: payload.userId, role: payload.role };
        next();
    }
    catch {
        return res.status(401).json({ message: "Unauthorized" });
    }
};
exports.authenticate = authenticate;
