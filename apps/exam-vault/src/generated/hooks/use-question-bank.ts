import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QuestionBankService } from "../services/question-bank-service";
import type { QuestionBank } from "../models/question-bank-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all QuestionBank records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, title, category, codeLanguage, correctAnswer, createdAt, createdBy, defaultPoints, difficultyKey, keywords, optionsJSON, questionText, questionTypeKey, tags, usageCount
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useQuestionBankList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["questionBank-list", options],
    queryFn: () => QuestionBankService.getAll(options),
  });
}

/**
 * Retrieve a single QuestionBank record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useQuestionBank(id: string) {
  return useQuery({
    queryKey: ["questionBank", id],
    queryFn: () => QuestionBankService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new QuestionBank record.
 * @remarks Form validation: use CreateQuestionBankSchema with zodResolver for type-safe create forms
 */
export function useCreateQuestionBank() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<QuestionBank, "id">) => QuestionBankService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["questionBank-list"] });
    },
  });
}

/**
 * Update an existing QuestionBank record.
 * @remarks Form validation: use UpdateQuestionBankSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateQuestionBank() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<QuestionBank, "id">>;
    }) => QuestionBankService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["questionBank-list"] });
      client.invalidateQueries({ queryKey: ["questionBank", variables.id] });
    },
  });
}

/**
 * Delete a QuestionBank record by its unique identifier.
 */
export function useDeleteQuestionBank() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => QuestionBankService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["questionBank-list"] });
      client.invalidateQueries({ queryKey: ["questionBank", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const QuestionBank_DATA_SOURCE_TYPE = 'InMemory' as const;

export { QuestionBankSchema, CreateQuestionBankSchema, UpdateQuestionBankSchema } from "../validators/question-bank-validator";
export type { QuestionBankInput, CreateQuestionBankInput, UpdateQuestionBankInput } from "../validators/question-bank-validator";