// backend/src/controllers/authController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db"; // Adjust to your prisma client path

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";

// 📝 USER REGISTRATION
export const register = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required fields." });
    }

    // Check if the user accounts exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "An account with that email already exists." });
    }

    // Hash the password with a secure salt factor of 10
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user to the database
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    console.log("SIGN SECRET:", process.env.JWT_SECRET);
    // Generate user token session
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });

    return res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("Registration processing error:", error);
    return res
      .status(500)
      .json({ error: "Internal server error during account creation." });
  }
};

// 🔑 USER LOGIN
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Please provide both email and password." });
    }

    // Locate the user record
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res
        .status(401)
        .json({
          error: "Invalid login credentials matching that user profile.",
        });
    }

    // Verify password match
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res
        .status(401)
        .json({
          error: "Invalid login credentials matching that user profile.",
        });
    }


    console.log("SIGN SECRET:", process.env.JWT_SECRET);
    // Establish a signed security token session
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });

    return res.status(200).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("Login processing error:", error);
    return res
      .status(500)
      .json({ error: "Internal server error during session processing." });
  }
};
