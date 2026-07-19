import "dotenv/config";

const secret = process.env.JWT_SECRET;

if (!secret) {
  console.error("FATAL ERROR: JWT_SECRET environment variable is missing!");
  process.exit(1);
}

export const JWT_SECRET = secret;
