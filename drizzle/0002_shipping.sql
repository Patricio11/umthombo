ALTER TABLE "orders" ADD COLUMN "shipping_address" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_fee_zar" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "delivery_fee_zar" integer;