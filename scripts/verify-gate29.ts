import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { getPublicationEditDecision, PUBLICATION_EDIT_WINDOW_MS } from "../src/lib/publicationEditWindow";

const publishedAt = "2026-01-01T00:00:00.000Z";
const within = new Date(Date.parse(publishedAt) + PUBLICATION_EDIT_WINDOW_MS - 1).toISOString();
const boundary = new Date(Date.parse(publishedAt) + PUBLICATION_EDIT_WINDOW_MS).toISOString();

assert.equal(getPublicationEditDecision({
  status: "published",
  firstPublishedAt: publishedAt,
  hasActivePublicationEntitlement: true,
  hasActiveOperationPlan: false,
  now: within,
}).allowed, true);
assert.equal(getPublicationEditDecision({
  status: "published",
  firstPublishedAt: publishedAt,
  hasActivePublicationEntitlement: true,
  hasActiveOperationPlan: false,
  now: boundary,
}).allowed, false);
assert.equal(getPublicationEditDecision({
  status: "published",
  firstPublishedAt: publishedAt,
  hasActivePublicationEntitlement: true,
  hasActiveOperationPlan: true,
  now: boundary,
}).allowed, true);
assert.equal(getPublicationEditDecision({
  status: "draft",
  firstPublishedAt: null,
  hasActivePublicationEntitlement: true,
  hasActiveOperationPlan: false,
}).allowed, true);
assert.equal(getPublicationEditDecision({
  status: "published",
  firstPublishedAt: null,
  hasActivePublicationEntitlement: true,
  hasActiveOperationPlan: false,
}).allowed, false);

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
assert.match(read("src/lib/bookRepository.ts"), /assertPublicationEditAccess/);
assert.match(read("src/app/api/books/edit-access/route.ts"), /getPublicationEditDecision/);
assert.match(read("src/components/ver2/PricingShowcasePage.tsx"), /公開後7日間は編集可能/);
assert.match(read("src/components/ver2/PricingShowcasePage.tsx"), /publish: "7日間"/);

console.log("Gate29 publication edit window verification passed.");
