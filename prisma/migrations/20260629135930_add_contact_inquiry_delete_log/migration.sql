-- CreateTable
CREATE TABLE "ContactInquiryDeleteLog" (
    "id" SERIAL NOT NULL,
    "contactInquiryId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "deletedData" JSONB NOT NULL,
    "deletedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactInquiryDeleteLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContactInquiryDeleteLog" ADD CONSTRAINT "ContactInquiryDeleteLog_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
