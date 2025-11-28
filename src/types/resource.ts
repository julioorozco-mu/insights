// Tipo extendido de FileAttachment para recursos del speaker
export interface SpeakerResource {
  id: string;
  ownerId: string;
  fileName: string;
  fileType: string;
  url: string;
  sizeKB?: number;
  category?: "document" | "video" | "image" | "other";
  assignedCourses?: string[]; // IDs de cursos asignados
  description?: string;
  tags?: string[];
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateSpeakerResourceData {
  ownerId: string;
  fileName: string;
  fileType: string;
  url: string;
  sizeKB?: number;
  category?: "document" | "video" | "image" | "other";
  description?: string;
  tags?: string[];
}

export interface UpdateSpeakerResourceData {
  fileName?: string;
  description?: string;
  category?: "document" | "video" | "image" | "other";
  assignedCourses?: string[];
  tags?: string[];
  isDeleted?: boolean;
}
