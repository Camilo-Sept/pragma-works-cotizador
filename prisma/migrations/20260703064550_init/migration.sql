-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'supervisor', 'ventas', 'operacion', 'lectura');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('draft', 'sent', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "QuoteMode" AS ENUM ('one_time', 'rental', 'hybrid');

-- CreateEnum
CREATE TYPE "SourceCodeOption" AS ENUM ('none', 'delivery_after_payment', 'full_buyout');

-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('one_time', 'monthly', 'annual', 'hourly');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('web', 'system', 'mobile', 'desktop', 'automation', 'ai', 'support', 'infrastructure', 'other');

-- CreateEnum
CREATE TYPE "ServiceSource" AS ENUM ('catalog', 'manual');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete', 'archive', 'status_change', 'create_revision', 'login', 'logout', 'login_failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'ventas',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "description_client" TEXT NOT NULL,
    "description_internal" TEXT,
    "billing_type" "BillingType" NOT NULL,
    "base_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimated_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" "ServiceSource" NOT NULL DEFAULT 'catalog',
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_rule_sets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "risk_percent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "urgency_percent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "commission_percent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "discount_percent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "source_delivery_percent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "source_buyout_percent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "rental_initial_percent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "rental_monthly_percent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "hybrid_initial_percent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "hybrid_monthly_percent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "minimum_one_time_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "minimum_monthly_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "website_annual_renewal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_rule_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'draft',
    "mode" "QuoteMode" NOT NULL,
    "source_code_option" "SourceCodeOption" NOT NULL DEFAULT 'none',
    "client_id" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "pricing_rule_set_id" TEXT,
    "rules_snapshot" JSONB NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "target_delivery_date" TIMESTAMP(3),
    "client_notes" TEXT,
    "internal_notes" TEXT,
    "one_time_subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "monthly_subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "annual_subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "hours_subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "risk_charge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "urgency_charge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commission_charge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "source_code_charge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "suggested_initial_payment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "suggested_monthly_payment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "suggested_annual_renewal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimated_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "effective_hourly_rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "revision_of_id" TEXT,
    "revision_number" INTEGER,
    "locked_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_items" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "service_id" TEXT,
    "name" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "billing_type" "BillingType" NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "estimated_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "source" "ServiceSource" NOT NULL,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "quote_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_active_idx" ON "users"("active");

-- CreateIndex
CREATE INDEX "clients_company_idx" ON "clients"("company");

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "clients"("email");

-- CreateIndex
CREATE INDEX "services_category_idx" ON "services"("category");

-- CreateIndex
CREATE INDEX "services_active_idx" ON "services"("active");

-- CreateIndex
CREATE INDEX "services_source_idx" ON "services"("source");

-- CreateIndex
CREATE INDEX "pricing_rule_sets_is_default_idx" ON "pricing_rule_sets"("is_default");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_folio_key" ON "quotes"("folio");

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "quotes"("status");

-- CreateIndex
CREATE INDEX "quotes_mode_idx" ON "quotes"("mode");

-- CreateIndex
CREATE INDEX "quotes_valid_until_idx" ON "quotes"("valid_until");

-- CreateIndex
CREATE INDEX "quotes_target_delivery_date_idx" ON "quotes"("target_delivery_date");

-- CreateIndex
CREATE INDEX "quotes_created_by_user_id_idx" ON "quotes"("created_by_user_id");

-- CreateIndex
CREATE INDEX "quotes_client_id_idx" ON "quotes"("client_id");

-- CreateIndex
CREATE INDEX "quotes_revision_of_id_idx" ON "quotes"("revision_of_id");

-- CreateIndex
CREATE INDEX "quote_items_quote_id_idx" ON "quote_items"("quote_id");

-- CreateIndex
CREATE INDEX "quote_items_service_id_idx" ON "quote_items"("service_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_quote_id_idx" ON "audit_logs"("quote_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_pricing_rule_set_id_fkey" FOREIGN KEY ("pricing_rule_set_id") REFERENCES "pricing_rule_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_revision_of_id_fkey" FOREIGN KEY ("revision_of_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
