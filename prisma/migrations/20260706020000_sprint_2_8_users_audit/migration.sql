-- Sprint 2.8: usuarios, permisos, autorizaciones y auditoría avanzada.

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'user_create';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'user_update';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'user_disable';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'user_enable';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'password_reset';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'permission_update';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'discount_applied';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'discount_approval_requested';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'discount_approved';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'discount_rejected';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'price_change_requested';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'price_change_approved';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'price_change_rejected';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'manual_item_requested';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'manual_item_approved';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'manual_item_rejected';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'catalog_price_change_requested';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'catalog_price_change_approved';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'catalog_price_change_rejected';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'pricing_rule_change_requested';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'pricing_rule_change_approved';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'pricing_rule_change_rejected';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'approval_requested';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'approval_approved';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'approval_rejected';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'approval_cancelled';

CREATE TYPE "ApprovalType" AS ENUM (
  'discount_over_10',
  'quote_item_price_change',
  'manual_priced_item',
  'catalog_price_change',
  'pricing_rule_change'
);

CREATE TYPE "ApprovalStatus" AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);

ALTER TABLE "users"
  ADD COLUMN "can_approve_discounts_over_10" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "can_approve_price_changes" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "can_approve_manual_priced_items" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "can_approve_catalog_price_changes" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "can_view_audit_logs" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "can_export_audit_logs" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "approval_requests" (
  "id" TEXT NOT NULL,
  "quote_id" TEXT,
  "quote_item_id" TEXT,
  "requested_by_user_id" TEXT NOT NULL,
  "resolved_by_user_id" TEXT,
  "type" "ApprovalType" NOT NULL,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
  "reason" TEXT,
  "resolution_notes" TEXT,
  "before" JSONB,
  "after" JSONB,
  "metadata" JSONB,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "approval_requests_quote_id_idx" ON "approval_requests"("quote_id");
CREATE INDEX "approval_requests_quote_item_id_idx" ON "approval_requests"("quote_item_id");
CREATE INDEX "approval_requests_requested_by_user_id_idx" ON "approval_requests"("requested_by_user_id");
CREATE INDEX "approval_requests_resolved_by_user_id_idx" ON "approval_requests"("resolved_by_user_id");
CREATE INDEX "approval_requests_type_idx" ON "approval_requests"("type");
CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");
CREATE INDEX "approval_requests_requested_at_idx" ON "approval_requests"("requested_at");

ALTER TABLE "approval_requests"
  ADD CONSTRAINT "approval_requests_quote_id_fkey"
    FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "approval_requests_quote_item_id_fkey"
    FOREIGN KEY ("quote_item_id") REFERENCES "quote_items"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "approval_requests_requested_by_user_id_fkey"
    FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "approval_requests_resolved_by_user_id_fkey"
    FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
