// backend/src/controllers/authController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db"; // Adjust to your prisma client path
import { JWT_SECRET } from "../config/jwt";
import { AuthRequest } from "../middleware/auth";
import { qdrantClient, COLLECTION_NAME } from "../config/qdrant";

const isProduction = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  path: "/" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

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

    // Generate user token session
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, cookieOptions);

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
      return res.status(401).json({
        error: "Invalid login credentials matching that user profile.",
      });
    }

    // Verify password match
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        error: "Invalid login credentials matching that user profile.",
      });
    }

    // Establish a signed security token session
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, cookieOptions);

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

// 🚪 USER LOGOUT
export const logout = async (req: Request, res: Response) => {
  res.clearCookie("token", {
    ...cookieOptions,
    maxAge: undefined,
  });
  return res.status(200).json({ message: "Successfully logged out" });
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Missing user session." });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        _count: {
          select: { repositories: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User profile not found." });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        repoCount: user._count.repositories,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ error: "Failed to fetch user profile." });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Missing user session." });
    }

    const { name } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { id: true, email: true, name: true },
    });

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ error: "Failed to update profile." });
  }
};
export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Missing user session." });
    }

    // 1. Fetch all repositories owned by user to delete Qdrant vector points
    const userRepos = await prisma.repository.findMany({
      where: { userId },
      select: { id: true },
    });

    for (const repo of userRepos) {
      try {
        await qdrantClient.delete(COLLECTION_NAME, {
          filter: {
            must: [{ key: "repositoryId", match: { value: repo.id } }],
          },
        });
      } catch (qdrantErr) {
        console.warn(`Qdrant deletion warning for repo ${repo.id}:`, qdrantErr);
      }
    }

    // 2. Delete User from Prisma (cascading deletes for repos, conversations, messages)
    await prisma.user.delete({
      where: { id: userId },
    });

    // 3. Clear auth cookie
    res.clearCookie("token", {
      ...cookieOptions,
      maxAge: undefined,
    });

    return res.status(200).json({
      message:
        "Account and all associated repository vector data deleted successfully.",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return res.status(500).json({ error: "Failed to delete user account." });
  }
};
