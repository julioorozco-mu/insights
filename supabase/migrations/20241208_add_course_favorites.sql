-- =====================================================
-- Migration: Add Course Favorites System
-- Description: Creates course_favorites table with RLS policies
--              for users to mark courses as favorites
-- =====================================================

-- 1. Create the course_favorites table
CREATE TABLE IF NOT EXISTS "public"."course_favorites" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "course_favorites_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "course_favorites_course_user_unique" UNIQUE ("course_id", "user_id"),
    CONSTRAINT "course_favorites_course_id_fkey" FOREIGN KEY ("course_id") 
        REFERENCES "public"."courses"("id") ON DELETE CASCADE,
    CONSTRAINT "course_favorites_user_id_fkey" FOREIGN KEY ("user_id") 
        REFERENCES "public"."users"("id") ON DELETE CASCADE
);

-- Add table comment
COMMENT ON TABLE "public"."course_favorites" IS 'Cursos marcados como favoritos por usuarios';

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_course_favorites_course_id" ON "public"."course_favorites" USING "btree" ("course_id");
CREATE INDEX IF NOT EXISTS "idx_course_favorites_user_id" ON "public"."course_favorites" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_course_favorites_created_at" ON "public"."course_favorites" USING "btree" ("created_at" DESC);

-- 3. Enable Row Level Security
ALTER TABLE "public"."course_favorites" ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (DROP IF EXISTS to make migration idempotent)

-- SELECT: Users can only view their own favorites
DROP POLICY IF EXISTS "course_favorites_select_own" ON "public"."course_favorites";
CREATE POLICY "course_favorites_select_own" 
    ON "public"."course_favorites" 
    FOR SELECT 
    USING ("auth"."uid"() = user_id);

-- INSERT: Users can only add their own favorites
DROP POLICY IF EXISTS "course_favorites_insert_own" ON "public"."course_favorites";
CREATE POLICY "course_favorites_insert_own" 
    ON "public"."course_favorites" 
    FOR INSERT 
    WITH CHECK ("auth"."uid"() = user_id);

-- DELETE: Users can only remove their own favorites
DROP POLICY IF EXISTS "course_favorites_delete_own" ON "public"."course_favorites";
CREATE POLICY "course_favorites_delete_own" 
    ON "public"."course_favorites" 
    FOR DELETE 
    USING ("auth"."uid"() = user_id);

-- 5. Grant permissions
GRANT ALL ON TABLE "public"."course_favorites" TO "anon";
GRANT ALL ON TABLE "public"."course_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."course_favorites" TO "service_role";

