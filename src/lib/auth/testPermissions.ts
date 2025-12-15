import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

export async function getLinkedCourseIdsForTest(testId: string): Promise<string[]> {
  const supabaseAdmin = getSupabaseAdmin();

  const courseIds = new Set<string>();

  const { data: courseTests, error: courseTestsError } = await supabaseAdmin
    .from('course_tests')
    .select('course_id')
    .eq('test_id', testId);

  if (courseTestsError) throw courseTestsError;
  (courseTests || []).forEach((ct: any) => {
    if (ct?.course_id) courseIds.add(ct.course_id);
  });

  const { data: linkedTests, error: linkedTestsError } = await supabaseAdmin
    .from('linked_tests')
    .select('course_id, lesson_id, section_id')
    .eq('test_id', testId);

  if (linkedTestsError) throw linkedTestsError;

  const lessonIds = new Set<string>();
  const sectionIds = new Set<string>();

  (linkedTests || []).forEach((lt: any) => {
    if (lt?.course_id) courseIds.add(lt.course_id);
    if (lt?.lesson_id) lessonIds.add(lt.lesson_id);
    if (lt?.section_id) sectionIds.add(lt.section_id);
  });

  if (lessonIds.size > 0) {
    const { data: lessons, error: lessonsError } = await supabaseAdmin
      .from(TABLES.LESSONS)
      .select('id, course_id')
      .in('id', Array.from(lessonIds));

    if (lessonsError) throw lessonsError;
    (lessons || []).forEach((l: any) => {
      if (l?.course_id) courseIds.add(l.course_id);
    });
  }

  if (sectionIds.size > 0) {
    const { data: sections, error: sectionsError } = await supabaseAdmin
      .from(TABLES.COURSE_SECTIONS)
      .select('id, course_id')
      .in('id', Array.from(sectionIds));

    if (sectionsError) throw sectionsError;
    (sections || []).forEach((s: any) => {
      if (s?.course_id) courseIds.add(s.course_id);
    });
  }

  return Array.from(courseIds);
}

export async function teacherHasViewAccessToTest(
  teacherUserId: string,
  testId: string
): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: testRow, error: testError } = await supabaseAdmin
    .from('tests')
    .select('id, created_by')
    .eq('id', testId)
    .maybeSingle();

  if (testError) throw testError;
  if (!testRow) return false;

  if ((testRow as any).created_by === teacherUserId) return true;

  const linkedCourseIds = await getLinkedCourseIdsForTest(testId);
  if (linkedCourseIds.length === 0) return false;

  const { data: assignedCourse, error: assignedCourseError } = await supabaseAdmin
    .from(TABLES.COURSES)
    .select('id')
    .in('id', linkedCourseIds)
    .contains('teacher_ids', [teacherUserId])
    .limit(1)
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
    .in('id', linkedCourseIds)
    .contains('teacher_ids', [(teacherRow as any).id])
    .limit(1)
    .maybeSingle();

  if (legacyAssignedCourseError) throw legacyAssignedCourseError;
  return !!legacyAssignedCourse;
}

export async function teacherIsTestCreator(teacherUserId: string, testId: string): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: testRow, error: testError } = await supabaseAdmin
    .from('tests')
    .select('created_by')
    .eq('id', testId)
    .maybeSingle();

  if (testError) throw testError;
  return (testRow as any)?.created_by === teacherUserId;
}

export async function getTeacherAssignedCourseIds(teacherUserId: string): Promise<string[]> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: courses, error } = await supabaseAdmin
    .from(TABLES.COURSES)
    .select('id')
    .contains('teacher_ids', [teacherUserId]);

  if (error) throw error;

  const ids = new Set((courses || []).map((c: any) => c.id).filter(Boolean));

  const { data: teacherRow, error: teacherError } = await supabaseAdmin
    .from(TABLES.TEACHERS)
    .select('id')
    .eq('user_id', teacherUserId)
    .maybeSingle();

  if (teacherError) throw teacherError;

  if (teacherRow?.id) {
    const { data: legacyCourses, error: legacyError } = await supabaseAdmin
      .from(TABLES.COURSES)
      .select('id')
      .contains('teacher_ids', [(teacherRow as any).id]);

    if (legacyError) throw legacyError;
    (legacyCourses || []).forEach((c: any) => {
      if (c?.id) ids.add(c.id);
    });
  }

  return Array.from(ids);
}
