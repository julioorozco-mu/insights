import { z } from "zod";

const enrollmentRulesSchema = z.object({
  type: z.enum(['before_start', 'date_range', 'anytime']),
}).optional();

export const createCourseSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  speakerIds: z.array(z.string()).min(1, "Debe haber al menos un ponente"),
  coHostIds: z.array(z.string()).optional(),
  coverImageUrl: z.string().url("URL inválida").optional(),
  thumbnailUrl: z.string().url("URL inválida").optional(),
  tags: z.array(z.string()).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  entrySurveyId: z.string().optional(),
  exitSurveyId: z.string().optional(),
  enrollmentRules: enrollmentRulesSchema,
  enrollmentStartDate: z.string().optional(),
  enrollmentEndDate: z.string().optional(),
});

export const updateCourseSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres").optional(),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres").optional(),
  coverImageUrl: z.string().url("URL inválida").optional(),
  speakerIds: z.array(z.string()).optional(),
  coHostIds: z.array(z.string()).optional(),
  lessonIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  durationMinutes: z.number().int().min(0).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  entrySurveyId: z.string().optional(),
  exitSurveyId: z.string().optional(),
  certificateTemplateId: z.string().optional(),
  formTemplateId: z.string().optional(),
  isLive: z.boolean().optional(),
  livePlaybackId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  enrollmentStartDate: z.string().optional(),
  enrollmentEndDate: z.string().optional(),
  unlimitedEnrollment: z.boolean().optional(),
  enrollmentRules: enrollmentRulesSchema,
  isActive: z.boolean().optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
