-- AlterTable
ALTER TABLE "StreamSession" ADD COLUMN     "destinations" JSONB,
ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'cloud';
