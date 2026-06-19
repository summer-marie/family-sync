-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- Add token as nullable first so existing rows are not blocked
ALTER TABLE "invite" ADD COLUMN "token" TEXT;

-- Backfill existing rows with a unique token using gen_random_uuid()
UPDATE "invite" SET "token" = gen_random_uuid()::TEXT WHERE "token" IS NULL;

-- Now make token NOT NULL and add the unique constraint
ALTER TABLE "invite" ALTER COLUMN "token" SET NOT NULL;
ALTER TABLE "invite" ADD CONSTRAINT "invite_token_key" UNIQUE ("token");

-- Add status column with default PENDING
ALTER TABLE "invite" ADD COLUMN "status" "InviteStatus" NOT NULL DEFAULT 'PENDING';
