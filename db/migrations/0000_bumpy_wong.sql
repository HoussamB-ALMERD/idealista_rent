CREATE TABLE "user_state" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"blacklisted_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"favorites" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_run_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"display_name" text,
	"telegram_bot_token" text NOT NULL,
	"telegram_bot_token_hash" text NOT NULL,
	"telegram_chat_id" bigint NOT NULL,
	"webhook_secret" text NOT NULL,
	"location" text NOT NULL,
	"max_price" text NOT NULL,
	"country" text DEFAULT 'it' NOT NULL,
	"operation" text DEFAULT 'rent' NOT NULL,
	"bedrooms" text[] DEFAULT '{"1","2","3"}' NOT NULL,
	"max_items" integer DEFAULT 50 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_error" text,
	"last_error_at" timestamp with time zone,
	CONSTRAINT "users_telegram_bot_token_hash_unique" UNIQUE("telegram_bot_token_hash"),
	CONSTRAINT "users_webhook_secret_unique" UNIQUE("webhook_secret")
);
--> statement-breakpoint
ALTER TABLE "user_state" ADD CONSTRAINT "user_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;