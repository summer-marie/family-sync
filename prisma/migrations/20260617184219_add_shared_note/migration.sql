-- CreateTable
CREATE TABLE "shared_note" (
    "id" TEXT NOT NULL,
    "familyGroupId" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT NOT NULL,

    CONSTRAINT "shared_note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shared_note_familyGroupId_key" ON "shared_note"("familyGroupId");

-- AddForeignKey
ALTER TABLE "shared_note" ADD CONSTRAINT "shared_note_familyGroupId_fkey" FOREIGN KEY ("familyGroupId") REFERENCES "family_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_note" ADD CONSTRAINT "shared_note_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
