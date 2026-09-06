import assert from "node:assert/strict";
import fs from "node:fs";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

const migration = read("supabase/migrations/018_gate20_support_replies.sql");
const adminAuth = read("src/lib/server/adminAuth.ts");
const listRoute = read("src/app/api/admin/inquiries/route.ts");
const detailRoute = read("src/app/api/admin/inquiries/[id]/route.ts");
const replyRoute = read("src/app/api/admin/inquiries/[id]/reply/route.ts");
const replyService = read("src/lib/server/contactReply.ts");
const adminPage = read("src/components/AdminInquiriesPage.tsx");

assert.match(migration, /create table if not exists public\.contact_inquiry_replies/i);
assert.match(migration, /enable row level security/i);
assert.match(migration, /revoke all on table public\.contact_inquiry_replies from anon, authenticated/i);
assert.match(migration, /idempotency_key text not null unique/i);
assert.match(adminAuth, /requireAuthenticatedUser/);
assert.match(adminAuth, /CONTACT_NOTIFICATION_EMAIL/);
assert.match(adminAuth, /app_metadata\?\.role === "admin"/);
for (const route of [listRoute, detailRoute, replyRoute]) assert.match(route, /authenticateAdminRequest/);
assert.match(replyRoute, /select\("id,name,reply_email,category,status"\)/);
assert.match(replyService, /to:\s*\[input\.recipient\]/);
assert.doesNotMatch(replyRoute, /record\.to|record\.email/);
assert.match(replyRoute, /send_status: "pending"/);
assert.match(replyRoute, /send_status: "sent"/);
assert.match(replyRoute, /status: "resolved"/);
assert.match(replyService, /RESEND_API_KEY/);
assert.match(replyService, /RESEND_FROM_EMAIL/);
assert.match(replyService, /contact@webbookmaker\.jp/);
assert.match(adminPage, /\/api\/admin\/inquiries/);
assert.match(adminPage, /Idempotency-Key/);
assert.match(adminPage, /返信先メールアドレス|問い合わせから確定|To:/);

console.log("Gate 20-S static verification passed.");
