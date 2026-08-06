import { validateSlug } from "@/lib/slug";

export type RequiredBookFieldKey = "title" | "author" | "description" | "authorHandle" | "slug";

export type RequiredBookFieldValidation = {
  hasTitle: boolean;
  hasAuthorName: boolean;
  hasDescription: boolean;
  hasAuthorHandle: boolean;
  hasSlug: boolean;
  isValid: boolean;
  globalError: string;
  firstMissingField?: RequiredBookFieldKey;
  fieldErrors: Partial<Record<RequiredBookFieldKey, string>>;
};

/**
 * The editor uses this as the single gate before save, preview, and publish.
 * Keep the order aligned with the form so the first invalid control receives focus.
 */
export function validateRequiredBookFields(input: {
  title: string;
  authorName: string;
  description: string;
  authorHandle: string;
  slug: string;
}): RequiredBookFieldValidation {
  const hasTitle = input.title.trim().length > 0;
  const hasAuthorName = input.authorName.trim().length > 0;
  const hasDescription = input.description.trim().length > 0;
  const hasAuthorHandle = input.authorHandle.trim().length > 0;
  const hasSlug = input.slug.trim().length > 0;
  const fieldErrors: Partial<Record<RequiredBookFieldKey, string>> = {};

  if (!hasTitle) fieldErrors.title = "タイトルを入力してください。";
  if (!hasAuthorName) fieldErrors.author = "著者名を入力してください。";
  if (!hasDescription) fieldErrors.description = "説明文を入力してください。";
  if (!hasAuthorHandle) {
    fieldErrors.authorHandle = "作者ハンドルを入力してください。";
  } else if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])$/.test(input.authorHandle.trim().toLowerCase())) {
    fieldErrors.authorHandle = "作者ハンドルは半角英数字とハイフンで入力してください。";
  }
  if (!hasSlug) {
    fieldErrors.slug = "公開URLを入力してください。";
  } else {
    const slugError = validateSlug(input.slug);
    if (slugError) fieldErrors.slug = slugError;
  }

  const firstMissingField = (["title", "author", "slug", "description", "authorHandle"] as const).find(
    (field) => Boolean(fieldErrors[field]),
  );
  const isValid = Object.keys(fieldErrors).length === 0;
  const hasMissingRequiredField = !hasTitle || !hasAuthorName || !hasDescription || !hasAuthorHandle || !hasSlug;

  return {
    hasTitle,
    hasAuthorName,
    hasDescription,
    hasAuthorHandle,
    hasSlug,
    isValid,
    globalError: hasMissingRequiredField ? "未入力の必須項目があります。" : "",
    firstMissingField,
    fieldErrors,
  };
}
