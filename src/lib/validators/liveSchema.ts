import { z } from "zod";

export const createLiveStreamSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  instructorId: z.string().min(1, "El instructor es requerido"),
  startAt: z.date().optional(),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1, "El mensaje no puede estar vacío").max(500, "El mensaje es muy largo"),
});

export type CreateLiveStreamInput = z.infer<typeof createLiveStreamSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
