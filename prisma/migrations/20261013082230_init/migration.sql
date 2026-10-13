-- CreateEnum
CREATE TYPE "RoleKind" AS ENUM ('system', 'music');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('google', 'email');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('en', 'uk');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_codes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" "RoleKind" NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameUk" TEXT NOT NULL,
    "isRemovable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "grantedById" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "songs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "originalKey" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "songs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "musicRoleId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "song_copies" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "sourceSongId" TEXT,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "originalKey" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "keyShift" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "syncedVersion" INTEGER,
    "isStandalone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "song_copies_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "songs_deletedAt_idx" ON "songs"("deletedAt");

-- CreateIndex
CREATE INDEX "playlists_userId_musicRoleId_idx" ON "playlists"("userId", "musicRoleId");

-- CreateIndex
CREATE INDEX "song_copies_playlistId_position_idx" ON "song_copies"("playlistId", "position");

-- CreateIndex
CREATE INDEX "song_copies_sourceSongId_idx" ON "song_copies"("sourceSongId");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "songs" ADD CONSTRAINT "songs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "songs" ADD CONSTRAINT "songs_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_musicRoleId_fkey" FOREIGN KEY ("musicRoleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_copies" ADD CONSTRAINT "song_copies_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_copies" ADD CONSTRAINT "song_copies_sourceSongId_fkey" FOREIGN KEY ("sourceSongId") REFERENCES "songs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
