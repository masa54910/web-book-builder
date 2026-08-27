import "server-only";

import { unstable_noStore } from "next/cache";
import type { BookContentBlock, BookProject } from "@/lib/bookProject";
import { parseBookProjectJson } from "@/lib/bookProjectNormalization";
import { normalizeAuthorPageHandle } from "@/lib/authorPage";
import { filterPublishedProject, visibleContentBlockIds } from "@/lib/publishedReaderSecurity";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { requireStripeClient } from "@/lib/server/stripe";
import { expectedStripeLivemode } from "@/lib/server/stripeEnvironment";
import { readPurchaseAccessSession } from "@/lib/server/purchaseAccessSession";
import type { ImageManifestRow } from "@/lib/types";
import type { PublishedReaderPayload } from "@/lib/publishedReaderTypes";
import type { DocumentTocEntry } from "@/lib/documentStructure";

function storageRef(value: string | undefined) {
  if (!value?.startsWith("storage:")) return null;
  const [bucket, ...parts] = value.slice("storage:".length).split("/");
  return bucket && parts.length ? { bucket, path: parts.join("/") } : null;
}

async function resolveImageUrl(value: string | undefined, admin: ReturnType<typeof requireSupabaseAdminClient>) {
  if (!value) return "";
  if (/^(?:https?:\/\/|data:image\/|blob:|\/)/i.test(value)) return value;
  const ref = storageRef(value) || (value.includes("/") ? { bucket: "book-assets", path: value } : null);
  if (!ref) return "";
  try {
    const { data } = await admin.storage.from(ref.bucket).createSignedUrl(ref.path, 60 * 60);
    return data?.signedUrl || "";
  } catch {
    return "";
  }
}

async function materializeFreeAssets(project: BookProject, visibleBlocks: BookContentBlock[], admin: ReturnType<typeof requireSupabaseAdminClient>) {
  const isFiltered = visibleBlocks.length !== (project.contentBlocks || []).length;
  const visibleBlockIds = visibleContentBlockIds(visibleBlocks);
  const ids = new Set(visibleBlocks.filter((block) => block.type === "image").map((block) => block.id));
  const images: ImageManifestRow[] = [];
  for (const image of project.images) {
    const id = image.image_id || image.image_index;
    if (!ids.has(id)) continue;
    const storagePath = image.storage_path || image.image_url;
    images.push({ ...image, image_url: storagePath, storage_path: storagePath || undefined, public_url: await resolveImageUrl(storagePath || image.public_url, admin) || undefined });
  }
  const contentBlocks = await Promise.all(visibleBlocks.map(async (block): Promise<BookContentBlock> => {
    if (block.type !== "image") return block;
    return { ...block, publicUrl: await resolveImageUrl(block.storagePath || block.publicUrl, admin) || undefined };
  }));
  return {
    ...project,
    config: {
      ...project.config,
      coverImageUrl: await resolveImageUrl(project.config.coverImage, admin) || undefined,
      pageAdjustments: isFiltered
        ? project.config.pageAdjustments?.filter((adjustment) => visibleBlockIds.has(adjustment.blockId))
        : project.config.pageAdjustments,
    },
    images,
    missingImageIds: isFiltered ? project.missingImageIds.filter((id) => ids.has(id)) : project.missingImageIds,
    contentBlocks,
  };
}

export async function loadPublishedReader(slug: string): Promise<PublishedReaderPayload | null> {
  unstable_noStore();
  const admin = requireSupabaseAdminClient();
  const { data: row, error } = await admin.from("books").select("id,owner_id,slug,title,description,author_name,book_project_json,status,visibility,deleted_at").eq("slug", slug).eq("status", "published").in("visibility", ["public", "unlisted"]).is("deleted_at", null).maybeSingle();
  if (error || !row) return null;
  const project = parseBookProjectJson(row.book_project_json);
  if (!project) return null;
  const originalBlocks = project.contentBlocks || [];
  const paywallIndex = originalBlocks.findIndex((block) => block.type === "paywall");
  const expectedLivemode = expectedStripeLivemode();
  const { data: settings } = await admin.from("book_sales_settings").select("enabled,amount,currency,stripe_payment_link_id,stripe_livemode").eq("book_id", row.id).eq("stripe_livemode", expectedLivemode).maybeSingle();
  const salesEnabled = Boolean(settings?.enabled);
  const session = paywallIndex >= 0 ? await readPurchaseAccessSession(String(row.id)) : null;
  let unlocked = false;
  if (session?.purchaseId) {
    const { data: purchase } = await admin.from("book_purchases").select("id,payment_status,revoked_at,stripe_livemode").eq("id", session.purchaseId).eq("book_id", row.id).eq("stripe_livemode", expectedLivemode).eq("payment_status", "paid").is("revoked_at", null).maybeSingle();
    unlocked = Boolean(purchase);
  }
  const locked = salesEnabled && paywallIndex >= 0 && !unlocked;
  const filtered = filterPublishedProject(project, paywallIndex, !locked);
  const materialized = await materializeFreeAssets(filtered.project, filtered.blocks, admin);
  const freeChapterTitles = new Set(filtered.project.chapters.map((chapter) => chapter.title));
  const lockedTocEntries: DocumentTocEntry[] = locked
    ? project.chapters.flatMap((chapter) => {
        if (freeChapterTitles.has(chapter.title)) return [];
        return [
          { headingId: `locked-${chapter.id}`, title: chapter.title, level: 1 as const, locked: true },
          ...(chapter.sections || []).filter((section) => section.level === 2).map((section) => ({ headingId: `locked-${section.id}`, title: section.title, level: 2 as const, locked: true })),
        ];
      })
    : [];
  let paymentUrl: string | undefined;
  if (locked && typeof settings?.stripe_payment_link_id === "string" && settings.stripe_payment_link_id) {
    try { paymentUrl = (await requireStripeClient().paymentLinks.retrieve(settings.stripe_payment_link_id)).url || undefined; } catch { paymentUrl = undefined; }
  }
  let authorPageHandle: string | null = null;
  const { data: profile } = await admin.from("profiles").select("handle,is_public").eq("id", row.owner_id).eq("is_public", true).maybeSingle();
  if (profile?.is_public && typeof profile.handle === "string") authorPageHandle = normalizeAuthorPageHandle(profile.handle);
  return {
    bookId: String(row.id), ownerId: String(row.owner_id), slug: String(row.slug), description: String(row.description || ""), authorPageHandle,
    project: materialized,
    access: locked ? { state: "locked", paymentUrl, amount: Number(settings?.amount || 0), currency: String(settings?.currency || "JPY"), lockedTocEntries } : { state: paywallIndex >= 0 ? "unlocked" : "free" },
  };
}
