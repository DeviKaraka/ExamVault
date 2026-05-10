import { z } from 'zod';

/**
 * Zod schema for QuestionBank validation
 */
export const QuestionBankSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, { message: "Title is required" }),
  category: z.string().min(1, { message: "Category is required" }),
  codeLanguage: z.string().optional(),
  correctAnswer: z.string().optional(),
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").min(1, { message: "Created At is required" }),
  createdBy: z.string().min(1, { message: "Created By is required" }),
  defaultPoints: z.number().int(),
  difficultyKey: z.enum(['DifficultyKey0', 'DifficultyKey1', 'DifficultyKey2']),
  keywords: z.string().optional(),
  optionsJSON: z.string().optional(),
  questionText: z.string().min(1, { message: "Question Text is required" }),
  questionTypeKey: z.enum(['QuestionTypeKey0', 'QuestionTypeKey1', 'QuestionTypeKey2', 'QuestionTypeKey3', 'QuestionTypeKey4', 'QuestionTypeKey5', 'QuestionTypeKey6', 'QuestionTypeKey7']),
  tags: z.string().optional(),
  usageCount: z.number().int(),
});

/**
 * Schema for creating a new QuestionBank (omits system-generated ID)
 */
export const CreateQuestionBankSchema = QuestionBankSchema.omit({ id: true });

/**
 * Schema for updating an existing QuestionBank
 */
export const UpdateQuestionBankSchema = QuestionBankSchema;

export type QuestionBankInput = z.infer<typeof QuestionBankSchema>;
export type CreateQuestionBankInput = z.infer<typeof CreateQuestionBankSchema>;
export type UpdateQuestionBankInput = z.infer<typeof UpdateQuestionBankSchema>;