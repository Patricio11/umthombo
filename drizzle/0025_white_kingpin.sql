CREATE TYPE "public"."promotion_type" AS ENUM('percent', 'fixed', 'free_shipping');--> statement-breakpoint
CREATE TABLE "promotion_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_id" uuid NOT NULL,
	"order_id" uuid,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"type" "promotion_type" NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"min_subtotal_zar" integer,
	"free_shipping_cap_zar" integer,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"usage_limit" integer,
	"stackable" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promotion_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coupon_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promo_discount_zar" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_cost_zar" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "container_discount_label" text;--> statement-breakpoint
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Backfill: existing orders charged the customer exactly the courier cost, so
-- the real cost equals what was charged. Without this, every historic delivery
-- order would report a R0 shipping cost.
UPDATE "orders" SET "shipping_cost_zar" = "delivery_fee_zar" WHERE "delivery_fee_zar" > 0;