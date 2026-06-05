ALTER TABLE "products" ADD COLUMN "delivery_fee_zar" integer;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "delivery_enabled" boolean;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "delivery_fee_type" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "delivery_percent" integer;