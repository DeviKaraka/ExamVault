import { z } from 'zod';

/**
 * Zod schema for Attempt validation
 */
export const AttemptSchema = z.object({
  id: z.string().uuid(),
  studentName: z.string().min(1, { message: "Student Name is required" }),
  autoScore: z.number().optional(),
  exam: z.object({ id: z.string().uuid(), title: z.string() }),
  manualScore: z.number().optional(),
  startedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").min(1, { message: "Started At is required" }),
  statusKey: z.enum(['StatusKey0', 'StatusKey1', 'StatusKey2', 'StatusKey3', 'StatusKey4']),
  studentEmail: z.string().email().min(1, { message: "Student Email is required" }),
  studentID: z.string().min(1, { message: "Student ID is required" }),
  submittedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").optional(),
  totalPossible: z.number().int(),
  totalScore: z.number().optional(),
  violationCount: z.number().int(),
});

/**
 * Schema for creating a new Attempt (omits system-generated ID)
 */
export const CreateAttemptSchema = AttemptSchema.omit({ id: true });

/**
 * Schema for updating an existing Attempt
 */
export const UpdateAttemptSchema = AttemptSchema;

export type AttemptInput = z.infer<typeof AttemptSchema>;
export type CreateAttemptInput = z.infer<typeof CreateAttemptSchema>;
export type UpdateAttemptInput = z.infer<typeof UpdateAttemptSchema>;