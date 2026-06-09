/*
  Warnings:

  - The values [deleted] on the enum `ReservationAction` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `deletedAt` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `deletedById` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `deletedById` on the `Reservation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[visitDate,visitTime]` on the table `Reservation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ReservationAction_new" AS ENUM ('created', 'updated', 'status_changed');
ALTER TABLE "ReservationHistory" ALTER COLUMN "action" TYPE "ReservationAction_new" USING ("action"::text::"ReservationAction_new");
ALTER TYPE "ReservationAction" RENAME TO "ReservationAction_old";
ALTER TYPE "ReservationAction_new" RENAME TO "ReservationAction";
DROP TYPE "public"."ReservationAction_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "ReservationHistory" DROP CONSTRAINT "ReservationHistory_reservationId_fkey";

-- DropIndex
DROP INDEX "Reservation_visitDate_visitTime_deletedAt_key";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "deletedAt",
DROP COLUMN "deletedById";

-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "deletedAt",
DROP COLUMN "deletedById";

-- CreateTable
CREATE TABLE "ProductDeleteLog" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "deletedById" INTEGER NOT NULL,
    "deletedData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductDeleteLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationDeleteLog" (
    "id" SERIAL NOT NULL,
    "reservationId" INTEGER NOT NULL,
    "visitDate" TEXT NOT NULL,
    "visitTime" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL,
    "deletedById" INTEGER NOT NULL,
    "deletedData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationDeleteLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_visitDate_visitTime_key" ON "Reservation"("visitDate", "visitTime");

-- AddForeignKey
ALTER TABLE "ProductDeleteLog" ADD CONSTRAINT "ProductDeleteLog_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationHistory" ADD CONSTRAINT "ReservationHistory_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationDeleteLog" ADD CONSTRAINT "ReservationDeleteLog_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
