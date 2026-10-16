-- AlterTable
ALTER TABLE "song_copies" ADD COLUMN     "bpm" INTEGER,
ADD COLUMN     "sectionDynamics" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "timeSignature" TEXT;
