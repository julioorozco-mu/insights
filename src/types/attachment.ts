// Colección: fileAttachments
export interface FileAttachment {
  id: string;
  ownerId: string;
  fileName: string;
  fileType: string;
  url: string;
  sizeKB?: number;
  category?: "student" | "speaker" | "lesson" | "course" | "general";
  relatedId?: string; // puede ser courseId, lessonId, etc.
  isDeleted?: boolean;
  createdAt: string;
}

// Colección: fileAttachmentsLesson
export interface FileAttachmentLesson {
  id: string;
  lessonId: string;
  fileIds: string[];
  createdAt: string;
}

// Colección: fileAttachmentsCourse
export interface FileAttachmentCourse {
  id: string;
  courseId: string;
  fileIds: string[];
  createdAt: string;
}

// Colección: videoRecordings
export interface VideoRecording {
  id: string;
  muxAssetId: string;
  muxPlaybackId: string;
  courseId: string;
  lessonId?: string;
  durationSeconds?: number;
  quality?: "720p" | "1080p" | "4k";
  createdAt: string;
  url?: string; // opcional si se descarga o convierte
}

export interface CreateFileAttachmentData {
  ownerId: string;
  fileName: string;
  fileType: string;
  url: string;
  sizeKB?: number;
  category?: "student" | "speaker" | "lesson" | "course" | "general";
  relatedId?: string;
}

export interface UpdateFileAttachmentData {
  fileName?: string;
  category?: "student" | "speaker" | "lesson" | "course" | "general";
  relatedId?: string;
  isDeleted?: boolean;
}

export interface CreateVideoRecordingData {
  muxAssetId: string;
  muxPlaybackId: string;
  courseId: string;
  lessonId?: string;
  durationSeconds?: number;
  quality?: "720p" | "1080p" | "4k";
}
