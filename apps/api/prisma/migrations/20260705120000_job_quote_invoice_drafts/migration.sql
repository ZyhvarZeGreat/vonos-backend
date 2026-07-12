-- Job quote & invoice draft fields (Mechanics / Mech Shop)
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "quoteNotes" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "quoteValidUntil" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "invoiceAmount" DECIMAL(65,30);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "invoiceNotes" TEXT;
