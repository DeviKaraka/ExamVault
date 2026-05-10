import { z } from 'zod';

/**
 * Zod schema for Question validation
 */
export const QuestionSchema = z.object({
  id: z.string().uuid(),
  questionTitle: z.string().min(1, { message: "Question Title is required" }),
  codeLanguage: z.string().optional(),
  correctAnswer: z.string().optional(),
  keywords: z.string().optional(),
  optionsJSON: z.string().optional(),
  orderIndex: z.number().int(),
  points: z.number().int(),
  questionText: z.string().min(1, { message: "Question Text is required" }),
  questionTypeKey: z.enum(['QuestionTypeKey0', 'QuestionTypeKey1', 'QuestionTypeKey2', 'QuestionTypeKey3', 'QuestionTypeKey4', 'QuestionTypeKey5', 'QuestionTypeKey6', 'QuestionTypeKey7']),
  section: z.object({ id: z.string().uuid(), name1: z.string() }),
});

/**
 * Schema for creating a new Question (omits system-generated ID)
 */
export const CreateQuestionSchema = QuestionSchema.omit({ id: true });

/**
 * Schema for updating an existing Question
 */
export const UpdateQuestionSchema = QuestionSchema;

export type QuestionInput = z.infer<typeof QuestionSchema>;
export type CreateQuestionInput = z.infer<typeof CreateQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof UpdateQuestionSchema>;