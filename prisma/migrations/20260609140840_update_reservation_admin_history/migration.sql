-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
