ALTER TABLE "order_items" ADD COLUMN "containers_returned" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "discount_zar" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_zar" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "container_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "container_discount_enabled" boolean;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "container_discount_percent" integer;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "container_discount_scope" text;