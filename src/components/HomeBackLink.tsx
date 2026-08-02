"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";

type Props = {
  className?: string;
  destination?: "auto" | "home" | "dashboard";
  label?: string;
};

function isDashboardContext(pathname: string) {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return true;
  if (pathname === "/books/new") return true;
  if (pathname === "/analytics" || pathname.startsWith("/analytics/")) return true;
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return true;
  if (pathname === "/author" || pathname.startsWith("/author/")) return true;
  if (pathname === "/reader" || pathname.startsWith("/reader/")) return true;
  return false;
}

export default function HomeBackLink({
  className = "maker-secondary-link home-back-link",
  destination = "auto",
  label,
}: Props) {
  const { user } = useAuth();
  const pathname = usePathname() ?? "";
  const inDashboardContext = isDashboardContext(pathname);

  if (destination === "auto" && pathname === "/dashboard") return null;

  const shouldUseDashboardTop = destination === "auto" ? Boolean(user) && inDashboardContext : destination === "dashboard";
  const href = shouldUseDashboardTop ? "/dashboard" : "/";
  const text = label ?? (shouldUseDashboardTop ? "← TOPへ戻る" : "← ホームへ戻る");

  return (
    <Link className={className} href={href}>
      {text}
    </Link>
  );
}
