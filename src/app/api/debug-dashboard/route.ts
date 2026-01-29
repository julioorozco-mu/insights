import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

export async function GET() {
    const supabase = getSupabaseAdmin();

    // Get ALL courses (not just active/published)
    const { data: allCoursesRaw } = await supabase
        .from(TABLES.COURSES)
        .select('id, title, is_active, is_published, average_rating');

    // Get all active published courses
    const { data: allCourses, error: coursesError } = await supabase
        .from(TABLES.COURSES)
        .select('id, title, is_active, is_published, average_rating')
        .eq('is_active', true)
        .eq('is_published', true)
        .order('average_rating', { ascending: false, nullsFirst: false })
        .limit(20);

    // Get the student record
    const { data: student } = await supabase
        .from(TABLES.STUDENTS)
        .select('id, user_id')
        .limit(5);

    // Get all enrollments 
    const { data: enrollments } = await supabase
        .from(TABLES.STUDENT_ENROLLMENTS)
        .select('id, student_id, course_id')
        .limit(20);

    return NextResponse.json({
        totalCoursesInDB: allCoursesRaw?.length || 0,
        allCoursesInDB: allCoursesRaw?.map(c => ({ id: c.id, title: c.title, active: c.is_active, published: c.is_published })),
        activePublishedCount: allCourses?.length || 0,
        courses: allCourses?.map(c => ({ id: c.id, title: c.title })),
        coursesError,
        students: student?.map(s => ({ id: s.id, user_id: s.user_id })),
        enrollments: enrollments?.map(e => ({ student_id: e.student_id, course_id: e.course_id })),
    });
}
