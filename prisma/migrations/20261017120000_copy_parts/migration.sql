-- CreateEnum
CREATE TYPE "PartDifficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateTable
CREATE TABLE "copy_parts" (
    "id" TEXT NOT NULL,
    "copyId" TEXT NOT NULL,
    "instrument" TEXT NOT NULL,
    "difficulty" "PartDifficulty" NOT NULL,
    "inputHash" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "copy_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_generations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "copy_parts_copyId_instrument_difficulty_key" ON "copy_parts"("copyId", "instrument", "difficulty");

-- CreateIndex
CREATE INDEX "part_generations_userId_createdAt_idx" ON "part_generations"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "copy_parts" ADD CONSTRAINT "copy_parts_copyId_fkey" FOREIGN KEY ("copyId") REFERENCES "song_copies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_generations" ADD CONSTRAINT "part_generations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
