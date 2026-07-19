-- AlterTable
ALTER TABLE "User" ADD COLUMN "password" TEXT;

-- Populate existing rows with a default hashed password (e.g., hash of "defaultpassword")
UPDATE "User" SET "password" = '$2a$10$r8zK74B6kHnO.UoR1UvTveR3CjTjE0CeeX5y6f1BfUoR1UvTveR3C' WHERE "password" IS NULL;

-- Enforce the non-null constraint
ALTER TABLE "User" ALTER COLUMN "password" SET NOT NULL;
