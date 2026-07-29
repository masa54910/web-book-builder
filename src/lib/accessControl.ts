import type { ReaderPage } from "@/lib/types";

export type BookStatus = "draft" | "published" | "archived";
export type BookVisibility = "private" | "unlisted" | "public";
export type AccessType = "free" | "paid" | "members" | "password" | "private";
export type PreviewMode = "none" | "chapters" | "pages" | "percent";

export type PublicationSettings = {
  status: BookStatus;
  visibility: BookVisibility;
  accessType: AccessType;
  monetizationEnabled: boolean;
  priceAmount: number | null;
  currency: "JPY" | "USD";
  previewMode: PreviewMode;
  previewValue: number | null;
};

export const DEFAULT_PUBLICATION_SETTINGS: PublicationSettings = {
  status: "draft",
  visibility: "private",
  accessType: "free",
  monetizationEnabled: false,
  priceAmount: null,
  currency: "JPY",
  previewMode: "none",
  previewValue: null,
};

export function canReadPublishedBook({
  status,
  visibility,
  isOwner,
}: {
  status: BookStatus;
  visibility: BookVisibility;
  isOwner?: boolean;
}) {
  if (isOwner) return true;
  if (status !== "published") return false;
  return visibility === "public" || visibility === "unlisted";
}

export function canReadSection() {
  return true;
}

export function canReadPage(page: ReaderPage, pageIndex: number) {
  void page;
  void pageIndex;
  return true;
}
