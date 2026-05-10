import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AttemptService } from "../services/attempt-service";
import type { Attempt } from "../models/attempt-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Attempt records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, studentName, autoScore, manualScore, startedAt, statusKey, studentEmail, studentID, submittedAt, totalPossible, totalScore, violationCount
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useAttemptList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["attempt-list", options],
    queryFn: () => AttemptService.getAll(options),
  });
}

/**
 * Retrieve a single Attempt record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useAttempt(id: string) {
  return useQuery({
    queryKey: ["attempt", id],
    queryFn: () => AttemptService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Attempt record.
 * @remarks Form validation: use CreateAttemptSchema with zodResolver for type-safe create forms
 */
export function useCreateAttempt() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Attempt, "id">) => AttemptService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["attempt-list"] });
    },
  });
}

/**
 * Update an existing Attempt record.
 * @remarks Form validation: use UpdateAttemptSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateAttempt() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Attempt, "id">>;
    }) => AttemptService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["attempt-list"] });
      client.invalidateQueries({ queryKey: ["attempt", variables.id] });
    },
  });
}

/**
 * Delete a Attempt record by its unique identifier.
 */
export function useDeleteAttempt() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => AttemptService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["attempt-list"] });
      client.invalidateQueries({ queryKey: ["attempt", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Attempt_DATA_SOURCE_TYPE = 'InMemory' as const;

export { AttemptSchema, CreateAttemptSchema, UpdateAttemptSchema } from "../validators/attempt-validator";
export type { AttemptInput, CreateAttemptInput, UpdateAttemptInput } from "../validators/attempt-validator";