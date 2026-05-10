import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QuestionService } from "../services/question-service";
import type { Question } from "../models/question-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Question records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, questionTitle, codeLanguage, correctAnswer, keywords, optionsJSON, orderIndex, points, questionText, questionTypeKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useQuestionList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["question-list", options],
    queryFn: () => QuestionService.getAll(options),
  });
}

/**
 * Retrieve a single Question record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useQuestion(id: string) {
  return useQuery({
    queryKey: ["question", id],
    queryFn: () => QuestionService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Question record.
 * @remarks Form validation: use CreateQuestionSchema with zodResolver for type-safe create forms
 */
export function useCreateQuestion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Question, "id">) => QuestionService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["question-list"] });
    },
  });
}

/**
 * Update an existing Question record.
 * @remarks Form validation: use UpdateQuestionSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateQuestion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Question, "id">>;
    }) => QuestionService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["question-list"] });
      client.invalidateQueries({ queryKey: ["question", variables.id] });
    },
  });
}

/**
 * Delete a Question record by its unique identifier.
 */
export function useDeleteQuestion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => QuestionService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["question-list"] });
      client.invalidateQueries({ queryKey: ["question", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Question_DATA_SOURCE_TYPE = 'InMemory' as const;

export { QuestionSchema, CreateQuestionSchema, UpdateQuestionSchema } from "../validators/question-validator";
export type { QuestionInput, CreateQuestionInput, UpdateQuestionInput } from "../validators/question-validator";