

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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "billing_email" "text",
    "plan" "text" DEFAULT 'free'::"text",
    "owner_uid" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "active" boolean DEFAULT true,
    "logo_url" "text"
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid",
    "user_id" "uuid",
    "role" "text" NOT NULL,
    CONSTRAINT "company_users_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'reader'::"text"])))
);


ALTER TABLE "public"."company_users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."company_user_mini" WITH ("security_barrier"='true') AS
 SELECT "cu"."company_id",
    "cu"."role",
    "u"."id",
    "u"."email",
    "u"."last_sign_in_at",
    ("u"."raw_user_meta_data" ->> 'full_name'::"text") AS "full_name",
    ("u"."raw_user_meta_data" ->> 'avatar_url'::"text") AS "avatar_url"
   FROM ("public"."company_users" "cu"
     JOIN "auth"."users" "u" ON (("u"."id" = "cu"."user_id")));


ALTER TABLE "public"."company_user_mini" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_mini" AS
 SELECT "users"."id",
    "users"."email",
    "users"."last_sign_in_at",
    "users"."raw_user_meta_data"
   FROM "auth"."users";


ALTER TABLE "public"."user_mini" OWNER TO "postgres";


ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_users"
    ADD CONSTRAINT "company_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_owner_uid_fkey" FOREIGN KEY ("owner_uid") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."company_users"
    ADD CONSTRAINT "company_users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_users"
    ADD CONSTRAINT "company_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "User can select their companies" ON "public"."companies" FOR SELECT USING ((("auth"."uid"() = "owner_uid") OR (EXISTS ( SELECT 1
   FROM "public"."company_users" "cu"
  WHERE (("cu"."company_id" = "companies"."id") AND ("cu"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can insert companies they own" ON "public"."companies" FOR INSERT WITH CHECK (("owner_uid" = "auth"."uid"()));



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "member can read company_users" ON "public"."company_users" FOR SELECT USING (("company_id" IN ( SELECT "company_users_1"."company_id"
   FROM "public"."company_users" "company_users_1"
  WHERE ("company_users_1"."user_id" = "auth"."uid"()))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_users" TO "anon";
GRANT ALL ON TABLE "public"."company_users" TO "authenticated";
GRANT ALL ON TABLE "public"."company_users" TO "service_role";



GRANT ALL ON TABLE "public"."company_user_mini" TO "anon";
GRANT ALL ON TABLE "public"."company_user_mini" TO "authenticated";
GRANT ALL ON TABLE "public"."company_user_mini" TO "service_role";



GRANT ALL ON TABLE "public"."user_mini" TO "anon";
GRANT ALL ON TABLE "public"."user_mini" TO "authenticated";
GRANT ALL ON TABLE "public"."user_mini" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
