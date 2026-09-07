"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import Button from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";
import { useUiLocale } from "@/components/UiLocaleProvider";
import { uiT } from "@/lib/localization";

const LOGOUT_ERROR_MESSAGE = "ログアウトできませんでした。もう一度お試しください。";

function getLogoutErrorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { message: String(error), code: undefined };
  }

  const value = error as { message?: unknown; code?: unknown };
  return {
    message: typeof value.message === "string" ? value.message : String(error),
    code: typeof value.code === "string" ? value.code : undefined,
  };
}

export default function LogoutButton({ className }: { className?: string }) {
  const { signOut } = useAuth();
  const { locale } = useUiLocale();
  const pathname = usePathname() || "/";
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogout() {
    if (isSigningOut) return;

    setIsSigningOut(true);
    setErrorMessage("");
    try {
      await signOut();
      // A full navigation avoids racing the auth listener and the protected
      // route's client-side redirect while the Supabase session is clearing.
      window.location.replace("/login");
    } catch (error) {
      const details = getLogoutErrorDetails(error);
      console.error("[logout] signOut failed", {
        operation: "signOut",
        path: pathname,
        "error.message": details.message,
        "error.code": details.code,
      });
      setErrorMessage(locale === "en" ? "We could not log you out. Please try again." : LOGOUT_ERROR_MESSAGE);
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={isSigningOut}
        disabled={isSigningOut}
        aria-busy={isSigningOut}
        className={className}
        onClick={() => void handleLogout()}
        ariaLabel={isSigningOut ? `${uiT(locale, "navigation.logout")}…` : uiT(locale, "navigation.logout")}
      >
        {isSigningOut ? `${uiT(locale, "navigation.logout")}…` : uiT(locale, "navigation.logout")}
      </Button>
      {errorMessage ? (
        <span className="logout-error" role="alert">
          {errorMessage}
        </span>
      ) : null}
    </>
  );
}
