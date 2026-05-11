/**
 * generated/hooks/index.ts
 *
 * Auto-generated reactive data-fetching hooks for ExamVault entities.
 *
 * Data layer strategy:
 *  - When VITE_SHAREPOINT_SITE_URL is set, hooks use the SharePoint REST API.
 *  - Otherwise, hooks fall back to in-memory data (development only).
 *
 * HAS_IN_MEMORY_TABLES is now false by default.
 * Set VITE_SHAREPOINT_SITE_URL in .env to switch to SharePoint.
 */

export const HAS_IN_MEMORY_TABLES =
  !import.meta.env.VITE_SHAREPOINT_SITE_URL;

export { useExam, useExams, useCreateExam, useUpdateExam, useDeleteExam } from "./use-exam";
export { useQuestion, useQuestions, useCreateQuestion, useUpdateQuestion, useDeleteQuestion } from "./use-question";
export { useAttempt, useAttempts, useCreateAttempt, useUpdateAttempt } from "./use-attempt";
export { useResponse, useResponses, useCreateResponse, useUpdateResponse } from "./use-response";
export { useSection, useSections, useCreateSection, useUpdateSection, useDeleteSection } from "./use-section";
export { useQuestionBank, useQuestionBanks, useCreateQuestionBank, useUpdateQuestionBank } from "./use-question-bank";
