import type { BookProject } from "@/lib/bookProject";
import type { DocumentTocEntry } from "@/lib/documentStructure";

export type PublishedReaderPayload = {
  bookId: string;
  ownerId: string;
  slug: string;
  description: string;
  authorPageHandle: string | null;
  project: BookProject;
  access: { state: "free" | "locked" | "unlocked"; paymentUrl?: string; amount?: number; currency?: string; lockedTocEntries?: DocumentTocEntry[]; sellerDisclosure?: { sellerName: string; address: string; supportEmail: string; paymentMethod: string; paymentTiming: string; digitalDeliveryTiming: string; refundPolicy: string; additionalCosts: string; applicationDeadline?: string } };
};
