export type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: unknown;
  hint?: unknown;
  statusCode?: number;
  error?: string;
};

function requestUrlForTarget(target: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  if (!base) return "";
  const storageBucket = target.match(/storage\.([^\s.]+)/)?.[1];
  if (storageBucket) return `${base}/storage/v1/object/${storageBucket}`;
  const relation = target.match(/(?:^|[.\s/])(books|book_images|book_external_links)(?=[.\s/]|$)/)?.[1];
  return relation ? `${base}/rest/v1/${relation}` : "";
}

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
  context?: Record<string, unknown>;
}) {
  const payload = normalizeError(input.error);
  const diagnostic = {
    processingName: input.processingName,
    target: input.target,
    requestUrl: requestUrlForTarget(input.target),
    message: payload.message,
    code: payload.code,
    details: payload.details,
    hint: payload.hint,
    statusCode: payload.statusCode,
    error: payload.error,
    ...input.context,
  };
  // Stringify so browser console collectors do not collapse the payload to
  // the unhelpful literal string "Object".
  console.error("[supabase-issue]", JSON.stringify(diagnostic));
}
