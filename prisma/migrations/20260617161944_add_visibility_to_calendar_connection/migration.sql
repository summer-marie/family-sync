-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('FULL', 'BUSY_ONLY');

-- AlterTable
ALTER TABLE "calendar_connection" ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'FULL';
