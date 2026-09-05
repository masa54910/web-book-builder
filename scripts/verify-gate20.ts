import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const migration = read("supabase/migrations/017_gate20_contact_inquiries.sql");
const contactRoute = read("src/app/api/contact/route.ts");
const contactForm = read("src/components/ContactForm.tsx");
const portalRoute = read("src/app/api/billing/portal/route.ts");
const pricing = read("src/components/ver2/PricingShowcasePage.tsx");
const terms = read("src/app/terms/page.tsx");
const commerce = read("src/app/commerce/page.tsx");
const refund = read("src/app/refund/page.tsx");
const landingFooter = read("src/components/ver2/LandingFooter.tsx");

assert.match(migration, /create table if not exists public\.contact_inquiries/i);
assert.match(migration, /enable row level security/i);
assert.match(migration, /revoke all on table public\.contact_inquiries from anon, authenticated/i);
assert.doesNotMatch(migration, /grant\s+/i);
assert.match(contactRoute, /requireSupabaseAdminClient/);
assert.match(contactRoute, /x-forwarded-for|x-real-ip/);
assert.match(contactRoute, /website/);
assert.match(contactRoute, /reply_email/);
assert.match(contactForm, /replyEmail/);
assert.match(contactForm, /category/);
assert.match(contactForm, /message/);
assert.match(portalRoute, /billingPortal\.sessions\.create/);
assert.match(portalRoute, /findActiveOperationPlanForUser/);
assert.match(pricing, /継続編集可能/);
assert.match(pricing, /複数作品/);
for (const stale of [/公開後7日間/, /最大10作品/, /PayPay/] as const) {
  assert.doesNotMatch(pricing, stale);
}
assert.match(terms, /作者.*販売者|Author.*Seller/);
assert.match(terms, /プランを管理/);
assert.match(commerce, /¥980/);
assert.match(commerce, /¥1,980/);
assert.match(refund, /二重(決済|請求)/);
assert.match(landingFooter, /href="\/contact"/);
assert.doesNotMatch(landingFooter, /support@webbookmaker\.app/);
console.log("Gate 20 static verification passed");
