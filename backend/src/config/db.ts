import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const dbUrl = process.env.DATABASE_URL || "";
const isNeon = dbUrl.includes("neon.tech");

export const prisma = isNeon
  ? new PrismaClient({
      adapter: new PrismaNeon({ connectionString: dbUrl }),
    })
  : new PrismaClient({
      adapter: new PrismaPg(new Pool({ connectionString: dbUrl })),
    });



