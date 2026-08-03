export type RequiredBookFieldValidation = {
  hasTitle: boolean;
  hasAuthorName: boolean;
  isValid: boolean;
  globalError: string;
  fieldErrors: {
    title?: string;
    author?: string;
  };
};

export function validateRequiredBookFields(input: {
  title: string;
  authorName: string;
}): RequiredBookFieldValidation {
  const hasTitle = input.title.trim().length > 0;
  const hasAuthorName = input.authorName.trim().length > 0;
  const isValid = hasTitle && hasAuthorName;

  return {
    hasTitle,
    hasAuthorName,
    isValid,
    globalError: isValid ? "" : "未入力項目があります。",
    fieldErrors: {
      title: hasTitle ? undefined : "タイトルを入力してください。",
      author: hasAuthorName ? undefined : "作者名を入力してください。",
    },
  };
}
