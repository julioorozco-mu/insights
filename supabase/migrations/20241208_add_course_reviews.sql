-- =====================================================
-- Migration: Add Course Reviews System
-- Description: Creates course_reviews table with RLS policies
--              and cached rating columns with auto-update triggers
-- =====================================================

-- 1. Create the course_reviews table
CREATE TABLE IF NOT EXISTS "public"."course_reviews" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "course_reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "course_reviews_rating_check" CHECK (("rating" >= 1) AND ("rating" <= 5)),
    CONSTRAINT "course_reviews_course_student_unique" UNIQUE ("course_id", "student_id"),
    CONSTRAINT "course_reviews_course_id_fkey" FOREIGN KEY ("course_id") 
        REFERENCES "public"."courses"("id") ON DELETE CASCADE,
    CONSTRAINT "course_reviews_student_id_fkey" FOREIGN KEY ("student_id") 
        REFERENCES "public"."users"("id") ON DELETE CASCADE
);

-- Add table comment
COMMENT ON TABLE "public"."course_reviews" IS 'Calificaciones y reseñas de cursos por estudiantes';
COMMENT ON COLUMN "public"."course_reviews"."rating" IS 'Calificación de 1 a 5 estrellas';
COMMENT ON COLUMN "public"."course_reviews"."comment" IS 'Reseña opcional del estudiante';

-- 2. Add cached rating columns to courses table
ALTER TABLE "public"."courses" 
ADD COLUMN IF NOT EXISTS "average_rating" numeric(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "reviews_count" integer DEFAULT 0;

COMMENT ON COLUMN "public"."courses"."average_rating" IS 'Promedio de calificaciones cacheado (1.00-5.00)';
COMMENT ON COLUMN "public"."courses"."reviews_count" IS 'Cantidad total de reseñas cacheado';

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_course_reviews_course_id" ON "public"."course_reviews" USING "btree" ("course_id");
CREATE INDEX IF NOT EXISTS "idx_course_reviews_student_id" ON "public"."course_reviews" USING "btree" ("student_id");
CREATE INDEX IF NOT EXISTS "idx_course_reviews_rating" ON "public"."course_reviews" USING "btree" ("rating");
CREATE INDEX IF NOT EXISTS "idx_course_reviews_created_at" ON "public"."course_reviews" USING "btree" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_courses_average_rating" ON "public"."courses" USING "btree" ("average_rating" DESC NULLS LAST);

-- 4. Create function to update cached rating stats
CREATE OR REPLACE FUNCTION "public"."update_course_rating_stats"()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_course_id uuid;
    new_avg numeric(3,2);
    new_count integer;
BEGIN
    -- Determine which course_id to update
    IF TG_OP = 'DELETE' THEN
        target_course_id := OLD.course_id;
    ELSE
        target_course_id := NEW.course_id;
    END IF;

    -- Calculate new stats
    SELECT 
        COALESCE(ROUND(AVG(rating)::numeric, 2), 0),
        COUNT(*)::integer
    INTO new_avg, new_count
    FROM "public"."course_reviews"
    WHERE course_id = target_course_id;

    -- Update the courses table
    UPDATE "public"."courses"
    SET 
        average_rating = new_avg,
        reviews_count = new_count,
        updated_at = NOW()
    WHERE id = target_course_id;

    -- Return appropriate row
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- 5. Create trigger to auto-update stats
DROP TRIGGER IF EXISTS "update_course_rating_stats_trigger" ON "public"."course_reviews";
CREATE TRIGGER "update_course_rating_stats_trigger"
    AFTER INSERT OR UPDATE OR DELETE ON "public"."course_reviews"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_course_rating_stats"();

-- 6. Create updated_at trigger for course_reviews
CREATE OR REPLACE TRIGGER "update_course_reviews_updated_at"
    BEFORE UPDATE ON "public"."course_reviews"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_updated_at_column"();

-- 7. Enable Row Level Security
ALTER TABLE "public"."course_reviews" ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies

-- SELECT: Anyone can view reviews (public)
CREATE POLICY "course_reviews_select_public" 
    ON "public"."course_reviews" 
    FOR SELECT 
    USING (true);

-- INSERT: Only authenticated students can create their own reviews
CREATE POLICY "course_reviews_insert_own" 
    ON "public"."course_reviews" 
    FOR INSERT 
    WITH CHECK (
        "auth"."uid"() = student_id
    );

-- UPDATE: Only the student who created the review can update it
CREATE POLICY "course_reviews_update_own" 
    ON "public"."course_reviews" 
    FOR UPDATE 
    USING ("auth"."uid"() = student_id)
    WITH CHECK ("auth"."uid"() = student_id);

-- DELETE: Only the student who created the review OR admins can delete
CREATE POLICY "course_reviews_delete_own_or_admin" 
    ON "public"."course_reviews" 
    FOR DELETE 
    USING (
        "auth"."uid"() = student_id
        OR EXISTS (
            SELECT 1 FROM "public"."users"
            WHERE "users"."id" = "auth"."uid"()
            AND "users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"])
        )
    );

-- 9. Grant permissions
GRANT ALL ON TABLE "public"."course_reviews" TO "anon";
GRANT ALL ON TABLE "public"."course_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."course_reviews" TO "service_role";

-- 10. Initialize cached stats for existing courses (if any reviews exist)
-- This is a one-time update to sync any existing data
UPDATE "public"."courses" c
SET 
    average_rating = COALESCE(stats.avg_rating, 0),
    reviews_count = COALESCE(stats.review_count, 0)
FROM (
    SELECT 
        course_id,
        ROUND(AVG(rating)::numeric, 2) as avg_rating,
        COUNT(*)::integer as review_count
    FROM "public"."course_reviews"
    GROUP BY course_id
) stats
WHERE c.id = stats.course_id;

