-- DropIndex
DROP INDEX "shared_note_familyGroupId_key";

-- AlterTable
ALTER TABLE "shared_note" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
