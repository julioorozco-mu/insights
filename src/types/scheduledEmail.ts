export interface ScheduledEmail {
  id: string;
  type: 'lesson' | 'course';
  lessonId?: string;
  courseId: string;
  lessonTitle: string;
  courseTitle?: string;
  scheduledDate: string; // ISO string
  recipients: string[]; // Array de user IDs
  status: 'pending' | 'sent' | 'cancelled' | 'failed';
  sentCount?: number;
  failedCount?: number;
  createdAt: string;
  createdBy: string;
  sentAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  error?: string;
}

export interface CreateScheduledEmailData {
  type: 'lesson' | 'course';
  lessonId?: string;
  courseId: string;
  lessonTitle: string;
  courseTitle?: string;
  scheduledDate: string;
  recipients: string[];
  createdBy: string;
}
