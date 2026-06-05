CREATE TABLE "settings" (
	"id" text PRIMARY KEY DEFAULT 'site' NOT NULL,
	"tagline" text,
	"story" text,
	"collection" text,
	"whatsapp_number" text,
	"whatsapp_display" text,
	"instagram_handle" text,
	"instagram_url" text,
	"facebook_handle" text,
	"facebook_url" text,
	"email" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
