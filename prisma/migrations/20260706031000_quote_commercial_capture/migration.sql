ALTER TABLE "quote_items"
ADD COLUMN IF NOT EXISTS "visible_to_client" BOOLEAN NOT NULL DEFAULT true;
