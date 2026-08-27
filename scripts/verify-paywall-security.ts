import assert from "node:assert/strict";

import { bookConfig } from "../src/config/bookConfig";
import { contentBlocksToRawText, extractChaptersFromText, type BookProject } from "../src/lib/bookProject";
import { buildReaderPages } from "../src/lib/paginateText";
import { createPurchaseAccessToken, purchaseAccessCookieOptions, verifyPurchaseAccessToken } from "../src/lib/purchaseAccessSessionCore";
import { filterPublishedProject } from "../src/lib/publishedReaderSecurity";

const SECRET = "SECRET_PAID_TEXT_9F7X";
const SESSION_SECRET = "fixture-session-secret";
const FREE_IMAGE_ID = "free-image";
const PAID_IMAGE_ID = "paid-image";
const FREE_VIDEO_ID = "free-video";
const PAID_VIDEO_ID = "paid-video";

const blocks = [
  { id: "free-a", type: "text" as const, content: "# 無料章\n\n無料本文A" },
  { id: "free-b", type: "text" as const, content: "無料本文B" },
  { id: FREE_IMAGE_ID, type: "image" as const, storagePath: "storage:book-assets/free.png", publicUrl: "", fileName: "free.png", mimeType: "image/png", width: 1200, height: 800, fitMode: "contain" as const, pageMode: "inline" as const },
  { id: FREE_VIDEO_ID, type: "youtube" as const, videoId: "dQw4w9WgXcQ", originalUrl: "https://youtu.be/dQw4w9WgXcQ", displayMode: "inline" as const },
  { id: "paywall-1", type: "paywall" as const },
  { id: "paid-a", type: "text" as const, content: SECRET },
  { id: PAID_IMAGE_ID, type: "image" as const, storagePath: "storage:book-assets/paid-secret.png", publicUrl: "https://signed.example/paid", fileName: "paid-secret.png", mimeType: "image/png", width: 1200, height: 800, fitMode: "contain" as const, pageMode: "inline" as const },
  { id: PAID_VIDEO_ID, type: "youtube" as const, videoId: "9bZkp7q19f0", originalUrl: "https://www.youtube.com/watch?v=9bZkp7q19f0" },
];

const project: BookProject = {
  version: 1,
  config: { ...bookConfig, bookId: "security-fixture", title: "Security Fixture", slug: "security-fixture" },
  chapters: [],
  rawText: contentBlocksToRawText(blocks),
  contentBlocks: blocks,
  images: [
    { chapter_order: 1, chapter_title: "無料章", image_index: FREE_IMAGE_ID, image_id: FREE_IMAGE_ID, image_url: "storage:book-assets/free.png", storage_path: "storage:book-assets/free.png", alt: "free", caption: "", source_path: "free.png", local_path: "" },
    { chapter_order: 2, chapter_title: "有料章", image_index: PAID_IMAGE_ID, image_id: PAID_IMAGE_ID, image_url: "storage:book-assets/paid-secret.png", storage_path: "storage:book-assets/paid-secret.png", alt: "paid", caption: "", source_path: "paid-secret.png", local_path: "" },
  ],
  missingImageIds: [PAID_IMAGE_ID],
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

const paywallIndex = blocks.findIndex((block) => block.type === "paywall");
const locked = filterPublishedProject(project, paywallIndex, false);
const lockedSerialized = JSON.stringify(locked.project);

assert.equal(locked.blocks.at(-1)?.type, "paywall");
assert.equal(locked.blocks.some((block) => block.type === "text" && block.content.includes("無料本文A")), true);
assert.equal(locked.blocks.some((block) => block.type === "text" && block.content.includes("無料本文B")), true);
assert.equal(locked.project.images.some((image) => image.image_id === PAID_IMAGE_ID), false);
assert.equal(locked.project.missingImageIds.includes(PAID_IMAGE_ID), false);
assert.equal(lockedSerialized.includes(SECRET), false, "paid text must not enter locked payload");
assert.equal(lockedSerialized.includes(PAID_IMAGE_ID), false, "paid image metadata must not enter locked payload");
assert.equal(lockedSerialized.includes(PAID_VIDEO_ID), false, "paid YouTube metadata must not enter locked payload");
assert.equal(lockedSerialized.includes("paid-secret.png"), false, "paid storage path must not enter locked payload");
assert.equal(lockedSerialized.includes("signed.example"), false, "paid signed URL must not enter locked payload");

const freeChapters = extractChaptersFromText(locked.project.rawText, locked.project.config.title, locked.blocks);
const pages = buildReaderPages({
  chapters: freeChapters,
  images: locked.project.images,
  contentBlocks: locked.blocks,
  charactersPerPage: 380,
  tableOfContentsItemsPerPage: 6,
  includePaywallPage: true,
});
const paywallPageIndex = pages.findIndex((page) => page.kind === "paywall");
assert.ok(paywallPageIndex >= 0, "locked reader must render a paywall page");
assert.equal(pages.at(-1)?.kind, "paywall", "page flip must stop at the paywall");

const unlocked = filterPublishedProject(project, paywallIndex, true);
assert.equal(JSON.stringify(unlocked.project).includes(SECRET), true, "unlocked reader keeps paid text");
assert.equal(unlocked.project.images.some((image) => image.image_id === PAID_IMAGE_ID), true);
assert.equal(JSON.stringify(unlocked.project).includes(PAID_VIDEO_ID), true, "unlocked reader keeps paid YouTube");

const noPaywallProject = { ...project, contentBlocks: project.contentBlocks?.filter((block) => block.type !== "paywall") };
const salesDisabled = filterPublishedProject(noPaywallProject, -1, false);
assert.equal(JSON.stringify(salesDisabled.project).includes(SECRET), true, "books without a paywall remain fully readable");

const issuedAt = 1_700_000_000_000;
const token = createPurchaseAccessToken("fixture-book", "purchase-1", false, SESSION_SECRET, issuedAt);
assert.equal(verifyPurchaseAccessToken(token, "fixture-book", false, SESSION_SECRET, issuedAt + 1)?.purchaseId, "purchase-1");
assert.equal(verifyPurchaseAccessToken(token, "other-book", false, SESSION_SECRET, issuedAt + 1), null, "session must be book-scoped");
assert.equal(verifyPurchaseAccessToken(token, "fixture-book", true, SESSION_SECRET, issuedAt + 1), null, "session must be Stripe-environment scoped");
assert.equal(verifyPurchaseAccessToken(`${token}tampered`, "fixture-book", false, SESSION_SECRET, issuedAt + 1), null, "tampered session must be rejected");
assert.equal(verifyPurchaseAccessToken(token, "fixture-book", false, SESSION_SECRET, issuedAt + 30 * 24 * 60 * 60 * 1000 + 1), null, "expired session must be rejected");
const cookie = purchaseAccessCookieOptions("fixture-book", true);
assert.equal(cookie.httpOnly, true);
assert.equal(cookie.secure, true);
assert.equal(cookie.sameSite, "lax");
assert.equal(cookie.path, "/books/fixture-book");

console.log("Paywall security fixture checks passed: locked payload excludes paid text, image, YouTube, URLs, and page tail.");
