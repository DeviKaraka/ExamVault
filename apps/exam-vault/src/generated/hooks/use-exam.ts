import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ExamService } from "../services/exam-service";
import type { Exam } from "../models/exam-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Exam records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, title, accessCode, allowReview, createdAt, createdBy, description, durationMinutes, endDateTime, passingScore, showResultsImmediately, startDateTime, statusKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useExamList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["exam-list", options],
    queryFn: () => ExamService.getAll(options),
  });
}

/**
 * Retrieve a single Exam record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useExam(id: string) {
  return useQuery({
    queryKey: ["exam", id],
    queryFn: () => ExamService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Exam record.
 * @remarks Form validation: use CreateExamSchema with zodResolver for type-safe create forms
 */
export function useCreateExam() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Exam, "id">) => ExamService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["exam-list"] });
    },
  });
}

/**
 * Update an existing Exam record.
 * @remarks Form validation: use UpdateExamSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateExam() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Exam, "id">>;
    }) => ExamService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["exam-list"] });
      client.invalidateQueries({ queryKey: ["exam", variables.id] });
    },
  });
}

/**
 * Delete a Exam record by its unique identifier.
 */
export function useDeleteExam() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ExamService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["exam-list"] });
      client.invalidateQueries({ queryKey: ["exam", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Exam_DATA_SOURCE_TYPE = 'InMemory' as const;

export { ExamSchema, CreateExamSchema, UpdateExamSchema } from "../validators/exam-validator";
export type { ExamInput, CreateExamInput, UpdateExamInput } from "../validators/exam-validator";