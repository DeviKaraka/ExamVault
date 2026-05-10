import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SectionService } from "../services/section-service";
import type { Section } from "../models/section-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Section records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, name1, instructions, mediaURL, orderIndex, passageText, sectionTypeKey, timeLimitMinutes
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useSectionList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["section-list", options],
    queryFn: () => SectionService.getAll(options),
  });
}

/**
 * Retrieve a single Section record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useSection(id: string) {
  return useQuery({
    queryKey: ["section", id],
    queryFn: () => SectionService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Section record.
 * @remarks Form validation: use CreateSectionSchema with zodResolver for type-safe create forms
 */
export function useCreateSection() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Section, "id">) => SectionService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["section-list"] });
    },
  });
}

/**
 * Update an existing Section record.
 * @remarks Form validation: use UpdateSectionSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateSection() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Section, "id">>;
    }) => SectionService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["section-list"] });
      client.invalidateQueries({ queryKey: ["section", variables.id] });
    },
  });
}

/**
 * Delete a Section record by its unique identifier.
 */
export function useDeleteSection() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SectionService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["section-list"] });
      client.invalidateQueries({ queryKey: ["section", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Section_DATA_SOURCE_TYPE = 'InMemory' as const;

export { SectionSchema, CreateSectionSchema, UpdateSectionSchema } from "../validators/section-validator";
export type { SectionInput, CreateSectionInput, UpdateSectionInput } from "../validators/section-validator";