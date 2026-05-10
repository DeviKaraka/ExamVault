import { z } from 'zod';

/**
 * Zod schema for Response validation
 */
export const ResponseSchema = z.object({
  id: z.string().uuid(),
  responseSummary: z.string().min(1, { message: "Response Summary is required" }),
  answerText: z.string().min(1, { message: "Answer Text is required" }),
  attempt: z.object({ id: z.string().uuid(), studentName: z.string() }),
  audioURL: z.string().url().optional(),
  graderFeedback: z.string().optional(),
  gradingStatusKey: z.enum(['GradingStatusKey0', 'GradingStatusKey1', 'GradingStatusKey2']),
  isCorrect: z.boolean().optional(),
  pointsEarned: z.number().optional(),
  question: z.object({ id: z.string().uuid(), questionTitle: z.string() }),
});

/**
 * Schema for creating a new Response (omits system-generated ID)
 */
export const CreateResponseSchema = ResponseSchema.omit({ id: true });

/**
 * Schema for updating an existing Response
 */
export const UpdateResponseSchema = ResponseSchema;

export type ResponseInput = z.infer<typeof ResponseSchema>;
export type CreateResponseInput = z.infer<typeof CreateResponseSchema>;
export type UpdateResponseInput = z.infer<typeof UpdateResponseSchema>;