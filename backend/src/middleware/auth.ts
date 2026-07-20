import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt";

// Augment Express's global Request type — the idiomatic TS+Express pattern.
// This adds `user` to every Request object so no interface extension is needed.
declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

// AuthRequest is now just an alias — kept for backwards compatibility
// with all controllers that import it.
export type AuthRequest = Request;

export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  let token: string | undefined;

  // Extract token from cookie first
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const list: Record<string, string> = {};
    cookieHeader.split(";").forEach((cookie) => {
      const parts = cookie.split("=");
      list[parts.shift()!.trim()] = decodeURIComponent(parts.join("="));
    });
    token = list["token"];
  }

  // Fallback to Authorization header
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized: Missing or invalid token.",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    req.user = { id: decoded.id };

    next();
  } catch (error) {
    return res.status(403).json({
      error: "Forbidden: Expired or invalid token.",
    });
  }
};

