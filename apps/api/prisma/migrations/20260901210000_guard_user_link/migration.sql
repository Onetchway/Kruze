-- AlterTable
ALTER TABLE "guards" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "guards_userId_key" ON "guards"("userId");

-- AddForeignKey
ALTER TABLE "guards" ADD CONSTRAINT "guards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
