"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

import { getRuntimeConfigurationError, isDemoModeAllowed, shouldUseSupabase } from "@/lib/appEnv";
import { getSupabaseClient } from "@/lib/supabase/client";
import { clearTransientSessionData } from "@/lib/auth/sessionCleanup";

type DemoUser = {
  id: string;
  email: string;
  displayName: string;
};

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
  isDemo: boolean;
};

type AuthContextValue = {
  user: AppUser | null;
  isLoading: boolean;
  authMode: "supabase" | "demo" | "blocked";
  configurationError: string;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string; message?: string }>;
  changePassword: (currentPassword: string, nextPassword: string) => Promise<{ error?: string; message?: string }>;
  deleteAccount: () => Promise<{ error?: string; message?: string }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const DEMO_USER_KEY = "webBookMaker:demo:user";

function toAppUser(user: User): AppUser {
  return {
    id: user.id,
    email: user.email ?? "",
    displayName:
      typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name
        : user.email ?? "ユーザー",
    isDemo: false,
  };
}

function readDemoUser() {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DEMO_USER_KEY) ?? "null");
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as DemoUser).id === "string" &&
      typeof (parsed as DemoUser).email === "string"
    ) {
      const demo = parsed as DemoUser;
      return {
        id: demo.id,
        email: demo.email,
        displayName: demo.displayName || demo.email,
        isDemo: true,
      } satisfies AppUser;
    }
  } catch {
    return null;
  }
  return null;
}

function writeDemoUser(email: string, displayName?: string) {
  const user: DemoUser = {
    id: `demo-${email.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "user"}`,
    email,
    displayName: displayName || email,
  };
  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
  return readDemoUser();
}

function mapAuthError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("too many") || lower.includes("429")) {
    return "短時間に認証リクエストが集中しています。少し時間を空けて再度お試しください。";
  }
  if (lower.includes("email not confirmed")) {
    return "メール確認が完了していません。受信した確認メールのリンクを開いてからログインしてください。";
  }
  if (lower.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const configurationError = getRuntimeConfigurationError();
  const authMode = shouldUseSupabase() ? "supabase" : isDemoModeAllowed() ? "demo" : "blocked";

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();

    if (!supabase) {
      if (!isDemoModeAllowed()) {
        const timer = window.setTimeout(() => {
          setUser(null);
          setIsLoading(false);
        }, 0);
        return () => window.clearTimeout(timer);
      }
      const timer = window.setTimeout(() => {
        setUser(readDemoUser());
        setIsLoading(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ? toAppUser(data.user) : null);
      setIsLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toAppUser(session.user) : null);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      authMode,
      configurationError,
      signUp: async (email, password, displayName) => {
        const supabase = getSupabaseClient();
        if (!supabase) {
          if (!isDemoModeAllowed()) return { error: configurationError };
          const demoUser = writeDemoUser(email, displayName);
          setUser(demoUser);
          return {};
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email },
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) return { error: mapAuthError(error.message) };
        if (!data.session && data.user && Array.isArray(data.user.identities) && data.user.identities.length > 0) {
          return { error: "確認メールを送信しました。メール内のリンクを開いたあとにログインしてください。" };
        }
        return {};
      },
      signIn: async (email, password) => {
        const supabase = getSupabaseClient();
        if (!supabase) {
          if (!isDemoModeAllowed()) return { error: configurationError };
          const demoUser = writeDemoUser(email);
          setUser(demoUser);
          return {};
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? { error: mapAuthError(error.message) } : {};
      },
      signOut: async () => {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
        }
        try {
          localStorage.removeItem(DEMO_USER_KEY);
        } catch {
          // Ignore local cleanup failures.
        }
        await clearTransientSessionData();
        setUser(null);
      },
      resetPassword: async (email) => {
        const supabase = getSupabaseClient();
        if (!supabase) {
          if (!isDemoModeAllowed()) return { error: configurationError };
          return {
            message:
              "デモモードではメール送信を行いません。Supabase設定後にパスワード再設定メールが送信されます。",
          };
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/auth/callback`,
        });
        return error ? { error: mapAuthError(error.message) } : { message: "再設定メールを送信しました。" };
      },
      changePassword: async (currentPassword, nextPassword) => {
        const supabase = getSupabaseClient();
        if (!supabase) {
          if (!isDemoModeAllowed()) return { error: configurationError };
          return { message: "デモモードではパスワード変更は行いません。" };
        }
        if (!user?.email) {
          return { error: "ログイン情報を確認できません。再ログイン後にお試しください。" };
        }
        const verify = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
        if (verify.error) {
          return { error: "現在のパスワードが正しくありません。" };
        }
        const update = await supabase.auth.updateUser({ password: nextPassword });
        if (update.error) {
          return { error: mapAuthError(update.error.message) };
        }
        return { message: "パスワードを更新しました。" };
      },
      deleteAccount: async () => {
        const supabase = getSupabaseClient();
        if (!supabase) {
          if (!isDemoModeAllowed()) return { error: configurationError };
          try {
            localStorage.removeItem(DEMO_USER_KEY);
          } catch {
            // Ignore local cleanup failures.
          }
          setUser(null);
          return { message: "デモアカウントを削除しました。" };
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session?.access_token) {
          return { error: "削除前の認証確認に失敗しました。再ログインしてください。" };
        }

        const response = await fetch("/api/account/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });
        const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
        if (!response.ok) {
          return { error: payload?.error || "アカウント削除に失敗しました。" };
        }
        await supabase.auth.signOut();
        setUser(null);
        return { message: payload?.message || "アカウントを削除しました。" };
      },
    }),
    [authMode, configurationError, isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
