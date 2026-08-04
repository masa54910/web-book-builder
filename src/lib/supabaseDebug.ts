export type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: unknown;
  hint?: unknown;
  statusCode?: number;
  error?: string;
};

function normalizeError(error: unknown): SupabaseErrorLike {
  if (typeof error !== "object" || error === null) {
    return { message: String(error ?? "") };
  }

  const value = error as SupabaseErrorLike;
  return {
    message: value.message ?? "",
    code: value.code ?? "",
    details: value.details,
    hint: value.hint,
    statusCode: value.statusCode,
    error: value.error ?? "",
  };
}

export function logSupabaseIssue(input: {
  processingName: string;
  target: string;
  error: unknown;
}) {
  const payload = normalizeError(input.error);
  console.error("[supabase-issue]", {
    processingName: input.processingName,
    target: input.target,
    message: payload.message,
    code: payload.code,
    details: payload.details,
    hint: payload.hint,
    statusCode: payload.statusCode,
    error: payload.error,
  });
}