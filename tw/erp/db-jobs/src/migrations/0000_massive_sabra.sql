DO $$ BEGIN
 CREATE TYPE "punch_record_type" AS ENUM('早上上班', '午間休息', '下午上班', '下午下班', '晚班上班', '晚班下班');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "user_role" AS ENUM('admin', 'worker');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "punch_modification" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_submitted" boolean DEFAULT false NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"requestor" integer NOT NULL,
	"request" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "punch_record" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_number" integer NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" "punch_record_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_number" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"user_number" serial PRIMARY KEY NOT NULL,
	"password" text NOT NULL,
	"role" "user_role" NOT NULL,
	"profile" jsonb
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "punch_modification" ADD CONSTRAINT "punch_modification_requestor_user_user_number_fk" FOREIGN KEY ("requestor") REFERENCES "user"("user_number") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "punch_record" ADD CONSTRAINT "punch_record_user_number_user_user_number_fk" FOREIGN KEY ("user_number") REFERENCES "user"("user_number") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_user_number_user_user_number_fk" FOREIGN KEY ("user_number") REFERENCES "user"("user_number") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
