-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME
);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "login_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameUk" TEXT NOT NULL,
    "isRemovable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "grantedById" TEXT,
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "roleId"),
    CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_roles_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "songs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "originalKey" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "searchKey" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "songs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "songs_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "playlists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "musicRoleId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "playlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "playlists_musicRoleId_fkey" FOREIGN KEY ("musicRoleId") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "song_copies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playlistId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "sourceSongId" TEXT,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "originalKey" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "keyShift" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "syncedVersion" INTEGER,
    "isStandalone" BOOLEAN NOT NULL DEFAULT false,
    "bpm" INTEGER,
    "timeSignature" TEXT,
    "sectionDynamics" JSONB NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "song_copies_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "song_copies_sourceSongId_fkey" FOREIGN KEY ("sourceSongId") REFERENCES "songs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "copy_parts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "copyId" TEXT NOT NULL,
    "instrument" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "copy_parts_copyId_fkey" FOREIGN KEY ("copyId") REFERENCES "song_copies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "part_generations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "part_generations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "setlists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "setlists_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "setlist_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "setlistId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "keyShift" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "setlist_items_setlistId_fkey" FOREIGN KEY ("setlistId") REFERENCES "setlists" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "setlist_items_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stage_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "setlistId" TEXT NOT NULL,
    "startedById" TEXT NOT NULL,
    "itemIndex" INTEGER NOT NULL DEFAULT 0,
    "bar" INTEGER NOT NULL DEFAULT 0,
    "keyShift" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "stage_sessions_setlistId_fkey" FOREIGN KEY ("setlistId") REFERENCES "setlists" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stage_sessions_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "auth_identities_userId_idx" ON "auth_identities"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_providerUserId_key" ON "auth_identities"("provider", "providerUserId");

-- CreateIndex
CREATE INDEX "login_codes_email_expiresAt_idx" ON "login_codes"("email", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE INDEX "songs_title_idx" ON "songs"("title");

-- CreateIndex
CREATE INDEX "songs_artist_idx" ON "songs"("artist");

-- CreateIndex
CREATE INDEX "songs_searchKey_idx" ON "songs"("searchKey");

-- CreateIndex
CREATE INDEX "songs_deletedAt_idx" ON "songs"("deletedAt");

-- CreateIndex
CREATE INDEX "playlists_userId_musicRoleId_idx" ON "playlists"("userId", "musicRoleId");

-- CreateIndex
CREATE INDEX "song_copies_playlistId_position_idx" ON "song_copies"("playlistId", "position");

-- CreateIndex
CREATE INDEX "song_copies_sourceSongId_idx" ON "song_copies"("sourceSongId");

-- CreateIndex
CREATE UNIQUE INDEX "copy_parts_copyId_instrument_difficulty_key" ON "copy_parts"("copyId", "instrument", "difficulty");

-- CreateIndex
CREATE INDEX "part_generations_userId_createdAt_idx" ON "part_generations"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "setlist_items_setlistId_position_idx" ON "setlist_items"("setlistId", "position");
