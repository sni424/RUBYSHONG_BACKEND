/*
  Warnings:

  - Made the column `finalPrice` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'selling',
ALTER COLUMN "finalPrice" SET NOT NULL;
