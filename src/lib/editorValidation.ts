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
 * The editor has one required field: the public URL (slug). All descriptive
 * fields are intentionally optional and are preserved as entered when present.
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

  if (!hasSlug) {
    fieldErrors.slug = "公開URLを入力してください。";
  } else {
    const slugError = validateSlug(input.slug);
    if (slugError) fieldErrors.slug = slugError;
  }

  const isValid = Object.keys(fieldErrors).length === 0;
  return {
    hasTitle,
    hasAuthorName,
    hasDescription,
    hasAuthorHandle,
    hasSlug,
    isValid,
    globalError: isValid ? "" : "公開URLを入力または修正してください。",
    firstMissingField: isValid ? undefined : "slug",
    fieldErrors,
  };
}
