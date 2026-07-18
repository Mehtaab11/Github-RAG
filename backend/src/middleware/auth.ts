import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  console.log("AUTH HEADER:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized: Missing or invalid token.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    console.log("TOKEN:", token);

    console.log("SIGN SECRET:", process.env.JWT_SECRET);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret",
    ) as { id: string };

    console.log("DECODED:", decoded);

    req.user = { id: decoded.id };

    next();
  } catch (error) {
    console.log("JWT ERROR:", error);
    return res.status(403).json({
      error: "Forbidden: Expired or invalid token.",
    });
  }
};
