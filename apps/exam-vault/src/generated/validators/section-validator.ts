import { z } from 'zod';

/**
 * Zod schema for Section validation
 */
export const SectionSchema = z.object({
  id: z.string().uuid(),
  name1: z.string().min(1, { message: "Name is required" }),
  exam: z.object({ id: z.string().uuid(), title: z.string() }),
  instructions: z.string().optional(),
  mediaURL: z.string().url().optional(),
  orderIndex: z.number().int(),
  passageText: z.string().optional(),
  sectionTypeKey: z.enum(['SectionTypeKey0', 'SectionTypeKey1', 'SectionTypeKey2', 'SectionTypeKey3', 'SectionTypeKey4', 'SectionTypeKey5', 'SectionTypeKey6', 'SectionTypeKey7']),
  timeLimitMinutes: z.number().int().optional(),
});

/**
 * Schema for creating a new Section (omits system-generated ID)
 */
export const CreateSectionSchema = SectionSchema.omit({ id: true });

/**
 * Schema for updating an existing Section
 */
export const UpdateSectionSchema = SectionSchema;

export type SectionInput = z.infer<typeof SectionSchema>;
export type CreateSectionInput = z.infer<typeof CreateSectionSchema>;
export type UpdateSectionInput = z.infer<typeof UpdateSectionSchema>;