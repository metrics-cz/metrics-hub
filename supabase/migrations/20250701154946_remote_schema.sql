

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






DO $$ BEGIN
    CREATE TYPE "public"."company_invitation_role" AS ENUM (
        'owner',
        'superadmin',
        'admin',
        'member'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


ALTER TYPE "public"."company_invitation_role" OWNER TO "postgres";


DO $$ BEGIN
    CREATE TYPE "public"."company_invitation_status" AS ENUM (
        'pending',
        'accepted',
        'rejected',
        'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


ALTER TYPE "public"."company_invitation_status" OWNER TO "postgres";


DO $$ BEGIN
    CREATE TYPE "public"."notification_type" AS ENUM (
        'company_invitation',
        'invitation_accepted',
        'invitation_rejected',
        'user_joined_company',
        'role_changed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


ALTER TYPE "public"."notification_type" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "billing_email" "text",
    "plan" "text" DEFAULT 'free'::"text",
    "owner_uid" "uuid",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "active" boolean DEFAULT true,
    "logo_url" "text"
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_invitations" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "userId" "uuid" NOT NULL,
    "companyId" "uuid" NOT NULL,
    "invitedBy" "uuid" NOT NULL,
    "role" "public"."company_invitation_role" DEFAULT 'member'::"public"."company_invitation_role" NOT NULL,
    "message" "text",
    "status" "public"."company_invitation_status" DEFAULT 'pending'::"public"."company_invitation_status" NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "acceptedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "notificationId" "uuid"
);


ALTER TABLE "public"."company_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_users" (
    "id" "text" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL
);


ALTER TABLE "public"."company_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" NOT NULL,
    "userId" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb",
    "read" boolean DEFAULT false NOT NULL,
    "actionUrl" "text",
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp with time zone
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_users"
    ADD CONSTRAINT "company_id_user_id_unique" UNIQUE ("company_id", "user_id");



ALTER TABLE ONLY "public"."company_invitations"
    ADD CONSTRAINT "company_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_users"
    ADD CONSTRAINT "company_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "companies_billing_email_key" ON "public"."companies" USING "btree" ("billing_email");



CREATE INDEX "company_invitations_companyId_idx" ON "public"."company_invitations" USING "btree" ("companyId");



CREATE INDEX "company_invitations_email_idx" ON "public"."company_invitations" USING "btree" ("email");



CREATE INDEX "company_invitations_invitedBy_idx" ON "public"."company_invitations" USING "btree" ("invitedBy");



CREATE INDEX "company_invitations_notificationId_idx" ON "public"."company_invitations" USING "btree" ("notificationId");



CREATE INDEX "company_invitations_status_idx" ON "public"."company_invitations" USING "btree" ("status");



CREATE INDEX "company_invitations_userId_idx" ON "public"."company_invitations" USING "btree" ("userId");



CREATE UNIQUE INDEX "company_users_company_id_user_id_key" ON "public"."company_users" USING "btree" ("company_id", "user_id");



CREATE INDEX "notifications_createdAt_idx" ON "public"."notifications" USING "btree" ("createdAt");



CREATE INDEX "notifications_read_idx" ON "public"."notifications" USING "btree" ("read");



CREATE INDEX "notifications_type_idx" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "notifications_userId_idx" ON "public"."notifications" USING "btree" ("userId");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_owner_uid_fkey" FOREIGN KEY ("owner_uid") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."company_invitations"
    ADD CONSTRAINT "company_invitations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."company_invitations"
    ADD CONSTRAINT "company_invitations_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."company_invitations"
    ADD CONSTRAINT "company_invitations_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "public"."notifications"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_invitations"
    ADD CONSTRAINT "company_invitations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."company_users"
    ADD CONSTRAINT "company_users_company_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "System can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "User can select their companies" ON "public"."companies" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "owner_uid") OR (EXISTS ( SELECT 1
   FROM "public"."company_users" "cu"
  WHERE (("cu"."company_id" = "companies"."id") AND ("cu"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can insert companies they own" ON "public"."companies" FOR INSERT WITH CHECK (("owner_uid" = "auth"."uid"()));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "userId"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "userId"));



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_users_self_select" ON "public"."company_users" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";








































































































































































GRANT SELECT ON TABLE "public"."companies" TO "anon";
GRANT SELECT ON TABLE "public"."companies" TO "authenticated";



GRANT SELECT ON TABLE "public"."company_invitations" TO "anon";
GRANT SELECT ON TABLE "public"."company_invitations" TO "authenticated";



GRANT SELECT ON TABLE "public"."company_users" TO "anon";
GRANT SELECT ON TABLE "public"."company_users" TO "authenticated";



GRANT SELECT ON TABLE "public"."notifications" TO "anon";
GRANT SELECT ON TABLE "public"."notifications" TO "authenticated";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT ON TABLES  TO "authenticated";



























RESET ALL;
