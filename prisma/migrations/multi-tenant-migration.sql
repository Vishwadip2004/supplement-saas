CREATE TABLE "tenants" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "plan" TEXT NOT NULL DEFAULT 'free',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

ALTER TABLE "users" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "products" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "customers" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "suppliers" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "sales" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "purchase_orders" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "tenantId" TEXT;

INSERT INTO "tenants" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Shop', 'default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE "users" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "products" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "customers" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "suppliers" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "sales" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "stock_movements" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "purchase_orders" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "audit_logs" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;

ALTER TABLE "users" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "customers" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "suppliers" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "sales" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "stock_movements" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "purchase_orders" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_sku_key";

ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_email_key" UNIQUE ("tenantId", "email");
ALTER TABLE "products" ADD CONSTRAINT "products_tenantId_sku_key" UNIQUE ("tenantId", "sku");

ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "idx_users_tenant" ON "users"("tenantId");
CREATE INDEX "idx_products_tenant" ON "products"("tenantId");
CREATE INDEX "idx_customers_tenant" ON "customers"("tenantId");
CREATE INDEX "idx_suppliers_tenant" ON "suppliers"("tenantId");
CREATE INDEX "idx_sales_tenant" ON "sales"("tenantId");
CREATE INDEX "idx_stock_movements_tenant" ON "stock_movements"("tenantId");
CREATE INDEX "idx_purchase_orders_tenant" ON "purchase_orders"("tenantId");
CREATE INDEX "idx_audit_logs_tenant" ON "audit_logs"("tenantId");
