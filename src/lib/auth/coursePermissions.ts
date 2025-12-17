import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

export async function teacherHasAccessToCourse(teacherUserId: string, courseId: string): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: assignedCourse, error: assignedCourseError } = await supabaseAdmin
    .from(TABLES.COURSES)
    .select('id')
    .eq('id', courseId)
    .contains('teacher_ids', [teacherUserId])
    .maybeSingle();

  if (assignedCourseError) throw assignedCourseError;
  if (assignedCourse) return true;

  const { data: teacherRow, error: teacherError } = await supabaseAdmin
    .from(TABLES.TEACHERS)
    .select('id')
    .eq('user_id', teacherUserId)
    .maybeSingle();

  if (teacherError) throw teacherError;
  if (!teacherRow?.id) return false;

  const { data: legacyAssignedCourse, error: legacyAssignedCourseError } = await supabaseAdmin
    .from(TABLES.COURSES)
    .select('id')
    .eq('id', courseId)
    .contains('teacher_ids', [teacherRow.id])
    .maybeSingle();

  if (legacyAssignedCourseError) throw legacyAssignedCourseError;
  return !!legacyAssignedCourse;
}
