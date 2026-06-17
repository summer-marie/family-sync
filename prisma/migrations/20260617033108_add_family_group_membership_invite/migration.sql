-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ORGANIZER', 'MEMBER');

-- CreateTable
CREATE TABLE "family_group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_membership" (
    "id" TEXT NOT NULL,
    "familyGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite" (
    "id" TEXT NOT NULL,
    "familyGroupId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_membership_familyGroupId_userId_key" ON "group_membership"("familyGroupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "group_membership_userId_key" ON "group_membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "invite_familyGroupId_email_key" ON "invite"("familyGroupId", "email");

-- AddForeignKey
ALTER TABLE "group_membership" ADD CONSTRAINT "group_membership_familyGroupId_fkey" FOREIGN KEY ("familyGroupId") REFERENCES "family_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_membership" ADD CONSTRAINT "group_membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite" ADD CONSTRAINT "invite_familyGroupId_fkey" FOREIGN KEY ("familyGroupId") REFERENCES "family_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
