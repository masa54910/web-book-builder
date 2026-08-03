export function resolveSafeInternalReturnPath(returnTo: string, fallback = "/dashboard") {
  if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}