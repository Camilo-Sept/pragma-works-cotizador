ALTER TABLE "quotes"
ADD COLUMN IF NOT EXISTS "suggested_delivery_date" TIMESTAMP(3);
