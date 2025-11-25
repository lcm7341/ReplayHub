-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Replay" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "format" TEXT NOT NULL,
    "fps" DOUBLE PRECISION NOT NULL,
    "name" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "levelId" INTEGER NOT NULL,
    "uploaderId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "hash" TEXT,

    CONSTRAINT "Replay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Replay_format_idx" ON "Replay"("format");

-- CreateIndex
CREATE INDEX "Replay_fps_idx" ON "Replay"("fps");

-- CreateIndex
CREATE INDEX "Replay_name_idx" ON "Replay"("name");

-- CreateIndex
CREATE INDEX "Replay_author_idx" ON "Replay"("author");

-- CreateIndex
CREATE INDEX "Replay_verified_idx" ON "Replay"("verified");

-- CreateIndex
CREATE INDEX "Replay_levelId_idx" ON "Replay"("levelId");

-- CreateIndex
CREATE INDEX "Replay_uploaderId_idx" ON "Replay"("uploaderId");

-- CreateIndex
CREATE INDEX "Replay_authorId_idx" ON "Replay"("authorId");

-- CreateIndex
CREATE INDEX "Replay_hash_idx" ON "Replay"("hash");

-- AddForeignKey
ALTER TABLE "Replay" ADD CONSTRAINT "Replay_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
