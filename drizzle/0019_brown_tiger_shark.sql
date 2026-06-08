CREATE TYPE "public"."custom_request_status" AS ENUM('pending', 'quoted', 'in_progress', 'ready', 'completed', 'declined', 'cancelled');--> statement-breakpoint
CREATE TABLE "custom_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_number" text NOT NULL,
	"status_token" text NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"category_id" uuid,
	"title" text NOT NULL,
	"scent" text,
	"colour" text,
	"size" text,
	"occasion" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"reference_images" jsonb,
	"status" "custom_request_status" DEFAULT 'pending' NOT NULL,
	"decline_reason" text,
	"admin_note" text,
	"quoted_price_zar" integer,
	"eta_text" text,
	"eta_date" timestamp with time zone,
	"deposit_required" boolean DEFAULT false NOT NULL,
	"deposit_zar" integer,
	"deposit_paid_at" timestamp with time zone,
	"balance_paid_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_requests_request_number_unique" UNIQUE("request_number"),
	CONSTRAINT "custom_requests_status_token_unique" UNIQUE("status_token")
);
--> statement-breakpoint
ALTER TABLE "custom_requests" ADD CONSTRAINT "custom_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_requests" ADD CONSTRAINT "custom_requests_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;