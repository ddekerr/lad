-- CreateTable
CREATE TABLE "setlists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "setlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setlist_items" (
    "id" TEXT NOT NULL,
    "setlistId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "keyShift" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "setlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_sessions" (
    "id" TEXT NOT NULL,
    "setlistId" TEXT NOT NULL,
    "startedById" TEXT NOT NULL,
    "itemIndex" INTEGER NOT NULL DEFAULT 0,
    "bar" INTEGER NOT NULL DEFAULT 0,
    "keyShift" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stage_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "setlist_items_setlistId_position_idx" ON "setlist_items"("setlistId", "position");

-- AddForeignKey
ALTER TABLE "setlists" ADD CONSTRAINT "setlists_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setlist_items" ADD CONSTRAINT "setlist_items_setlistId_fkey" FOREIGN KEY ("setlistId") REFERENCES "setlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setlist_items" ADD CONSTRAINT "setlist_items_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_sessions" ADD CONSTRAINT "stage_sessions_setlistId_fkey" FOREIGN KEY ("setlistId") REFERENCES "setlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_sessions" ADD CONSTRAINT "stage_sessions_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
