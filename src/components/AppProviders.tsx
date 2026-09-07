"use client";

import { AuthProvider } from "@/lib/auth/AuthContext";
import { UiLocaleProvider } from "@/components/UiLocaleProvider";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return <UiLocaleProvider><AuthProvider>{children}</AuthProvider></UiLocaleProvider>;
}
