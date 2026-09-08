import { resolveSafeInternalReturnPath } from "@/lib/returnTo";

export function resolveAuthCallbackDestination({
  flow,
  type,
  next,
}: {
  flow: string | null;
  type: string | null;
  next: string | null;
}) {
  if (flow === "recovery" || type === "recovery") {
    const safeNext = resolveSafeInternalReturnPath(next ?? "", "/login");
    return `/reset-password?next=${encodeURIComponent(safeNext)}`;
  }
  return resolveSafeInternalReturnPath(next ?? "", "/dashboard");
}

export function isSignupCallback({ flow, type }: { flow: string | null; type: string | null }) {
  return flow === "maker-signup" || type === "signup";
}

export function getAuthCallbackErrorMessage(errorCode: string | null, errorDescription: string | null) {
  const text = `${errorCode ?? ""} ${errorDescription ?? ""}`.toLowerCase();
  if (text.includes("expired") || text.includes("otp_expired")) {
    return "認証リンクの有効期限が切れています。もう一度確認メールを送信してください。";
  }
  if (text.includes("invalid") || text.includes("token") || text.includes("code")) {
    return "認証リンクが無効です。新しい確認メールを送信してください。";
  }
  return "認証できませんでした。もう一度お試しください。";
}
