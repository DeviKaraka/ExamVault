import { z } from 'zod';

/**
 * Zod schema for Exam validation
 */
export const ExamSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, { message: "Title is required" }),
  accessCode: z.string().min(1, { message: "Access Code is required" }),
  allowReview: z.boolean(),
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").min(1, { message: "Created At is required" }),
  createdBy: z.string().min(1, { message: "Created By is required" }),
  description: z.string().optional(),
  durationMinutes: z.number().int(),
  endDateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").optional(),
  passingScore: z.number().int(),
  showResultsImmediately: z.boolean(),
  startDateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").optional(),
  statusKey: z.enum(['StatusKey0', 'StatusKey1', 'StatusKey2']),
});

/**
 * Schema for creating a new Exam (omits system-generated ID)
 */
export const CreateExamSchema = ExamSchema.omit({ id: true });

/**
 * Schema for updating an existing Exam
 */
export const UpdateExamSchema = ExamSchema;

export type ExamInput = z.infer<typeof ExamSchema>;
export type CreateExamInput = z.infer<typeof CreateExamSchema>;
export type UpdateExamInput = z.infer<typeof UpdateExamSchema>;